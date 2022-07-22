import { getRepository } from 'typeorm'
import { Profile } from '../entities/profile'

const nicknameRecommendations = [
  '가즈아', '흑우', '블랙카우', '손절장인', '익항옳', '이말올', '이럴거면왜올림', '이럴거면왜내림', '대폰지', '결국폰지사기',
  '오늘도물타기', '물린뒤전망조사', '강제장투', '야미털기', '건전한조정', '코린이', '버거타임', '세력', '타노스빔', '우지한의', '떡락충', '침팬치',
  '메로나', '장대양봉', '스크류바', '장대음봉', '투더문', '기도매매', '우상향', '존버의신', '행복회로불탐', '리또속', '워뇨띠꿈나무', '했제충',
  '무지성롱', '어제청산당함', '청산당할예정', '데드캣', '단타의신', '그새팔았음', '뚝100불남음', '다시는안칠게요', '귀하의포지션이', '방금음전',
  '올해10만불', '숏스톤대가리볶음', '롱스톤대가리볶음', '비둘기대가리빨기', '이걸못봤네', '모든걸잃음', '이걸음전하네', '7주연속음봉', '천국의계단',
  '코인은사기다', '크립토트레이더', '백수', '영끌대출청산', '짧은뚝배기', '청산에살어리랏다', '노동의소중함', '자본주의의한계', '지지', '저항',
  '불황', '잃을게없는사람', '벼랑끝에몰린청년', '상방쐐기', '하방쐐기', '삼각수렴', '불플래그', '베어플래그', '바닥이없네', '지하실구경', '우박사',
  '불건전한조정', '코인왜하냐', 'BJ파월', '대공황', '부처빔', '떡상', '떡락', '무소유빔', '4년후에봐요', '비트코인은끝났다', '청년의희망마진', '한강뷰보단한강',
  '박호두추종자', '짭반꿀', '양봉보니까설렘', '무한금리인상', '다신안올고점', '초고층입주자', '팔자마자떡상', '사자마자떡락', '돈과인연없는사람',
  '4년전에살걸', '껄무새', '이상한닉네임', '1메다짜리음봉', '제가뭘봤어요', '왜아무도말을안해', '돈벌기싫은사람', '차라리기부할걸', '어두운미래',
  '일단물리고시작', '하루만에반토막', '비트맥시', '자이언트스텝', '울트라스텝', '오늘도연설있냐', '오를까요', '풀숏', '빅쇼트', '빅롱트', '어디까지가냐',
  '코인충추종자', '세계관이박호두', '호반꿀', '셀반꿀', '나이따', '이렇게또성장', '자본주의폰지사기', '양적완화좀해줘', '금리좀내려라', '마지막으로100배',
  '따갚되', '오늘만사는놈', '내일은없다', '리치말고영앤리치', '인성쓰레기', '천사', '왜오르는거임', '왜내리는거임', '다신보지말자', '한번만본절좀',
]

const nicknameService = {
  useIfUnique: async (nickname: string): Promise<string> => {
    const existing = await getRepository(Profile).findOne({ nickname })
    if (existing) return Promise.reject({ message: 'existing nickname' })

    return nickname
  },
  generate: (): string => {
    const randIdx = Math.floor(Math.random() * nicknameRecommendations.length)
    const randNo = Math.floor(Math.random() * 100 + 1)
    return `${nicknameRecommendations[randIdx]}${randNo}`
  },
  generateUnique: async (iteration = 0): Promise<string> => {
    if (iteration > 10) return Promise.reject({ message: `couldn't generate the unique nickname in ${iteration} iterations.` })

    const nickname = nicknameService.generate()
    const existing = await getRepository(Profile).findOne({ nickname })
    if (!existing) return nickname

    return await nicknameService.generateUnique(iteration + 1)
  },
}

export default nicknameService