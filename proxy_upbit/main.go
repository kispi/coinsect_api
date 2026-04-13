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
	throttlingMS = 1000

	upgrader = websocket.Upgrader{
		EnableCompression: true, // ← 압축 활성화 (가장 중요)
		ReadBufferSize:    4096,
		WriteBufferSize:   4096,
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

			if hostname == "localhost" || hostname == "127.0.0.1" {
				return true
			}

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

	// 전역 구독 상태
	globalSubs   = make(map[string]map[string]bool)
	globalSubsMu sync.Mutex

	// 스로틀링용 최신 데이터 캐시
	latestData   = make(map[string][]byte)
	latestDataMu sync.Mutex
)

type Client struct {
	Conn *websocket.Conn
	Subs map[string]map[string]bool
	Mu   sync.RWMutex
}

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

	// 업비트 연결
	go connectToUpbit()

	// 스로틀링 브로드캐스터
	if throttlingMS > 0 {
		go throttledBroadcaster()
	}

	http.HandleFunc("/ws", handleClientConnection)

	fmt.Printf("Upbit Proxy Started on :%s (Throttling %dms, Compression: Enabled)\n", port, throttlingMS)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

// 업비트 연결 (압축 적용)
func connectToUpbit() {
	dialer := websocket.Dialer{
		EnableCompression: true, // ← Upbit → 서버 구간도 압축
		ReadBufferSize:    8192,
		WriteBufferSize:   8192,
	}

	for {
		log.Println("Attempting to connect to Upbit...")
		conn, _, err := dialer.Dial(UPBIT_WS_URL, nil)
		if err != nil {
			log.Printf("Upbit Dial Error: %v. Retrying in 3 seconds...", err)
			time.Sleep(3 * time.Second)
			continue
		}

		log.Println("Connected to Upbit")

		upbitMu.Lock()
		upbitConn = conn
		upbitMu.Unlock()

		sendGlobalSubscriptionsToUpbit()

		for {
			_, msg, err := conn.ReadMessage()
			if err != nil {
				log.Println("Upbit Read Error:", err)
				break
			}
			processUpbitMessage(msg)
		}

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

	// 클라이언트 연결마다 압축 명시적 활성화
	conn.EnableWriteCompression(true)

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
		recalculateGlobalSubscriptions()
	}()

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

	sendGlobalSubscriptionsToUpbit()
}

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

	if throttlingMS == 0 {
		broadcastToSubscribers(typ, code, msg)
		return
	}

	key := typ + ":" + code
	latestDataMu.Lock()
	latestData[key] = msg
	latestDataMu.Unlock()
}

func throttledBroadcaster() {
	ticker := time.NewTicker(time.Duration(throttlingMS) * time.Millisecond)
	for range ticker.C {
		latestDataMu.Lock()
		snapshot := latestData
		latestData = make(map[string][]byte)
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

func broadcastToSubscribers(typ string, code string, msg []byte) {
	clientsMu.RLock()
	defer clientsMu.RUnlock()

	for client := range clients {
		client.Mu.RLock()
		subMap, typeExists := client.Subs[typ]
		isSubscribed := typeExists && subMap[code]
		client.Mu.RUnlock()

		if isSubscribed {
			_ = client.Conn.WriteMessage(websocket.TextMessage, msg)
		}
	}
}
