// goapi(kispi/goapi, 폐기됨)의 data/countries.json을 옮긴 것이다.
// JSON 파일이 아니라 TS 모듈인 이유: 이 레포의 빌드는 tsc뿐이라(package.json의 build)
// .json은 dist/로 복사되지 않는다. constants/symbols.ts와 같은 방식이다.

export type Country = {
  code: string
  name: string
  emoji: string
}

const countries: Country[] = [{"code":"US","name":"United States","emoji":"🇺🇸"},{"code":"CN","name":"China","emoji":"🇨🇳"},{"code":"KR","name":"South Korea","emoji":"🇰🇷"},{"code":"JP","name":"Japan","emoji":"🇯🇵"},{"code":"DE","name":"Germany","emoji":"🇩🇪"},{"code":"FR","name":"France","emoji":"🇫🇷"},{"code":"GB","name":"United Kingdom","emoji":"🇬🇧"},{"code":"IT","name":"Italy","emoji":"🇮🇹"},{"code":"ES","name":"Spain","emoji":"🇪🇸"},{"code":"IR","name":"Iran","emoji":"🇮🇷"},{"code":"IL","name":"Israel","emoji":"🇮🇱"},{"code":"TR","name":"Turkey","emoji":"🇹🇷"},{"code":"RU","name":"Russia","emoji":"🇷🇺"},{"code":"BR","name":"Brazil","emoji":"🇧🇷"},{"code":"CA","name":"Canada","emoji":"🇨🇦"},{"code":"AU","name":"Australia","emoji":"🇦🇺"},{"code":"IN","name":"India","emoji":"🇮🇳"},{"code":"SA","name":"Saudi Arabia","emoji":"🇸🇦"},{"code":"MX","name":"Mexico","emoji":"🇲🇽"},{"code":"ID","name":"Indonesia","emoji":"🇮🇩"},{"code":"NL","name":"Netherlands","emoji":"🇳🇱"},{"code":"BE","name":"Belgium","emoji":"🇧🇪"},{"code":"SE","name":"Sweden","emoji":"🇸🇪"},{"code":"CH","name":"Switzerland","emoji":"🇨🇭"},{"code":"SV","name":"El Salvador","emoji":"🇸🇻"}]

export default countries
