package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/joho/godotenv"
)

const (
	UPBIT_WS_URL = "wss://api.upbit.com/websocket/v1"
)

var (
	// throttlingMS = 0 이면 스로틀링 없이 즉시 전송
	// 지정된 값(예: 300)이면 그 ms 마다 모아서 전송
	throttlingMS = 1000
	upgrader     = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			origin := r.Header.Get("Origin")
			if origin == "" {
				return false
			}

			u, err := url.Parse(origin)
			if err != nil {
				return false
			}

			hostname := u.Hostname()

			// 1. Localhost 허용
			if hostname == "localhost" || hostname == "127.0.0.1" {
				return true
			}

			// 2. coinsect.io 및 *.coinsect.io 허용
			if hostname == "coinsect.io" || strings.HasSuffix(hostname, ".coinsect.io") {
				return true
			}

			return false
		},
	}

	// 업비트와의 단일 연결 관리
	upbitConn *websocket.Conn
	upbitMu   sync.Mutex

	// 접속 중인 클라이언트 관리
	clients   = make(map[*Client]bool)
	clientsMu sync.RWMutex

	// 전역 구독 상태 (업비트로 전송할 합쳐진 구독)
	// Type -> Code -> true
	globalSubs   = make(map[string]map[string]bool)
	globalSubsMu sync.Mutex

	// 스로틀링을 위한 최신 데이터 캐시
	// Key: "type:code" (예: "ticker:KRW-BTC")
	// Value: 최신 JSON 메시지([]byte)
	latestData   = make(map[string][]byte)
	latestDataMu sync.Mutex
)

// 개별 클라이언트 커넥션과 구독 상태
type Client struct {
	Conn *websocket.Conn
	// Type -> Code -> true
	Subs map[string]map[string]bool
	Mu   sync.RWMutex
}

// 업비트 통신(JSON) 파싱용 기본 구조체
// SIMPLE 포맷 시 ty(타입), cd(코드)로 들어오는 이슈 대응
type UpbitBasicMsg struct {
	Type string `json:"type"`
	Ty   string `json:"ty"`
	Code string `json:"code"`
	Cd   string `json:"cd"`
}

func (m *UpbitBasicMsg) GetType() string {
	if m.Type != "" {
		return m.Type
	}
	return m.Ty
}

func (m *UpbitBasicMsg) GetCode() string {
	if m.Code != "" {
		return m.Code
	}
	return m.Cd
}

func main() {
	_ = godotenv.Load()

	port := os.Getenv("WEBSOCKET_PORT")
	if port == "" {
		port = "8080"
	}

	if tMs := os.Getenv("THROTTLING_MS"); tMs != "" {
		if val, err := strconv.Atoi(tMs); err == nil {
			throttlingMS = val
		}
	}

	// 1. 단일 업비트 연결 리스너
	go connectToUpbit()

	// 2. 브로드캐스팅 스로틀러
	if throttlingMS > 0 {
		go throttledBroadcaster()
	}

	// 3. 클라이언트 웹소켓 허브
	http.HandleFunc("/ws", handleClientConnection)

	fmt.Printf("Upbit Proxy Started on :%s (Throttling %dms)\n", port, throttlingMS)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

// 업비트 단일 연결 및 재연결 유지
func connectToUpbit() {
	for {
		log.Println("Attempting to connect to Upbit...")
		conn, _, err := websocket.DefaultDialer.Dial(UPBIT_WS_URL, nil)
		if err != nil {
			log.Printf("Upbit Dial Error: %v. Retrying in 3 seconds...", err)
			time.Sleep(3 * time.Second)
			continue
		}

		log.Println("Connected to Upbit")

		upbitMu.Lock()
		upbitConn = conn
		upbitMu.Unlock()

		// 연결 직후 현재까지 확보된 전역 구독을 재전송
		sendGlobalSubscriptionsToUpbit()

		// 메시지 수신 무한루프
		for {
			_, msg, err := conn.ReadMessage()
			if err != nil {
				log.Println("Upbit Read Error:", err)
				break
			}
			processUpbitMessage(msg)
		}

		// 연결 종료 시 리셋
		upbitMu.Lock()
		upbitConn = nil
		upbitMu.Unlock()
		conn.Close()
		time.Sleep(1 * time.Second)
	}
}

// 클라이언트 연결 핸들러
func handleClientConnection(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Upgrade error:", err)
		return
	}

	client := &Client{
		Conn: conn,
		Subs: make(map[string]map[string]bool),
	}

	clientsMu.Lock()
	clients[client] = true
	clientsMu.Unlock()

	defer func() {
		clientsMu.Lock()
		delete(clients, client)
		clientsMu.Unlock()
		conn.Close()
		// 클라이언트 종료 시 글로벌 구독 갱신
		recalculateGlobalSubscriptions()
	}()

	// 클라이언트가 보내는 구독 Array를 파싱
	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			break
		}

		var payload []map[string]interface{}
		if err := json.Unmarshal(msg, &payload); err != nil {
			continue
		}

		client.Mu.Lock()
		client.Subs = make(map[string]map[string]bool)
		for _, item := range payload {
			rawType, ok := item["type"].(string)
			if !ok || rawType == "" {
				continue
			}
			rawCodes, ok := item["codes"].([]interface{})
			if !ok {
				continue
			}

			if client.Subs[rawType] == nil {
				client.Subs[rawType] = make(map[string]bool)
			}
			for _, c := range rawCodes {
				if codeStr, o := c.(string); o {
					client.Subs[rawType][codeStr] = true
				}
			}
		}
		client.Mu.Unlock()

		// 새 구독 추가되면 글로벌 구독 갱신
		recalculateGlobalSubscriptions()
	}
}

// 모든 접속 클라이언트의 구독상태를 취합 (합집합 처리)
func recalculateGlobalSubscriptions() {
	newGlobalSubs := make(map[string]map[string]bool)

	clientsMu.RLock()
	for client := range clients {
		client.Mu.RLock()
		for t, codes := range client.Subs {
			if newGlobalSubs[t] == nil {
				newGlobalSubs[t] = make(map[string]bool)
			}
			for code := range codes {
				newGlobalSubs[t][code] = true
			}
		}
		client.Mu.RUnlock()
	}
	clientsMu.RUnlock()

	globalSubsMu.Lock()
	globalSubs = newGlobalSubs
	globalSubsMu.Unlock()

	// 갱신될 때마다 업비트에 새 구독 배포
	sendGlobalSubscriptionsToUpbit()
}

// 글로벌 구독 리스트를 포맷에 맞춰 업비트로 발송
func sendGlobalSubscriptionsToUpbit() {
	upbitMu.Lock()
	conn := upbitConn
	upbitMu.Unlock()

	if conn == nil {
		return
	}

	globalSubsMu.Lock()
	defer globalSubsMu.Unlock()

	if len(globalSubs) == 0 {
		return
	}

	ticket := fmt.Sprintf("%d", time.Now().UnixNano())
	payload := []interface{}{
		map[string]string{"ticket": ticket},
	}

	for typ, codeMap := range globalSubs {
		var codes []string
		for code := range codeMap {
			codes = append(codes, code)
		}
		if len(codes) > 0 {
			payload = append(payload, map[string]interface{}{
				"type":  typ,
				"codes": codes,
			})
		}
	}

	payload = append(payload, map[string]string{"format": "SIMPLE"})

	msgBytes, _ := json.Marshal(payload)
	err := conn.WriteMessage(websocket.TextMessage, msgBytes)
	if err != nil {
		log.Println("Failed to send subscription to Upbit:", err)
	}
}

// 업비트에서 온 바이너리 JSON 메시지 처리
func processUpbitMessage(msg []byte) {
	var basicMsg UpbitBasicMsg
	if err := json.Unmarshal(msg, &basicMsg); err != nil {
		return
	}

	typ := basicMsg.GetType()
	code := basicMsg.GetCode()
	if typ == "" || code == "" {
		return
	}

	// 0이면 스로틀링 없이 즉시 직접전파
	if throttlingMS == 0 {
		broadcastToSubscribers(typ, code, msg)
		return
	}

	// 스로틀링 중이면 버퍼 메모리에 적재해서 최신 데이터를 덮어씌움
	key := typ + ":" + code
	latestDataMu.Lock()
	latestData[key] = msg
	latestDataMu.Unlock()
}

// 일정 주기마다(throttlingMS) 적재된 최신 버퍼 데이터를 클라이언트에게만 배포
func throttledBroadcaster() {
	ticker := time.NewTicker(time.Duration(throttlingMS) * time.Millisecond)
	for range ticker.C {
		latestDataMu.Lock()
		snapshot := latestData
		latestData = make(map[string][]byte) // 비우기
		latestDataMu.Unlock()

		if len(snapshot) == 0 {
			continue
		}

		clientsMu.RLock()
		for client := range clients {
			var batched [][]byte

			client.Mu.RLock()
			for key, msg := range snapshot {
				parts := strings.Split(key, ":")
				if len(parts) == 2 {
					typ, code := parts[0], parts[1]
					if subMap, ok := client.Subs[typ]; ok && subMap[code] {
						batched = append(batched, msg)
					}
				}
			}
			client.Mu.RUnlock()

			if len(batched) > 0 {
				var sb strings.Builder
				sb.WriteString("[")
				for i, b := range batched {
					if i > 0 {
						sb.WriteString(",")
					}
					sb.Write(b)
				}
				sb.WriteString("]")
				
				_ = client.Conn.WriteMessage(websocket.TextMessage, []byte(sb.String()))
			}
		}
		clientsMu.RUnlock()
	}
}

// 데이터 타입과 코드를 구독하고 있는 클라이언트 필터링하여 TextMessage 전송
func broadcastToSubscribers(typ string, code string, msg []byte) {
	clientsMu.RLock()
	defer clientsMu.RUnlock()

	for client := range clients {
		client.Mu.RLock()
		subMap, typeExists := client.Subs[typ]
		isSubscribed := false
		if typeExists && subMap[code] {
			isSubscribed = true
		}
		client.Mu.RUnlock()

		// 구독중인 유저에게만 "텍스트 형식"으로 배포 (클라이언트에서 Blob 파싱 불필요)
		if isSubscribed {
			_ = client.Conn.WriteMessage(websocket.TextMessage, msg)
		}
	}
}
