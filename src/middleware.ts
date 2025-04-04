import { NextResponse } from "next/server";
// import type { NextMiddleware } from "next/server";

import { NextRequest } from "next/server";

// const middleware: NextMiddleware = (request) => {
//   console.log("--------------------------------");
//   console.log("--------------------------------");
//   const { url, nextUrl, headers } = request;
//   const clonedUrl = nextUrl.clone();
//   const detectedHost = headers.get("host");
//   const detectedXForwardedHost = headers.get("x-forwarded-host");
//   const newHost = detectedXForwardedHost ?? detectedHost ?? nextUrl.host;
//   const newHref = clonedUrl.href.replace(nextUrl.host, newHost);

//   console.log(`clonedUrl.href.replace(${nextUrl.host}, ${newHost})`);
//   console.log(newHref);

//   if (nextUrl.host === newHost) {
//     console.log(nextUrl);

//     return NextResponse.next();
//   }

//   console.log("middleware detecting host");
//   console.log(nextUrl);
//   console.log({
//     url,
//     host: nextUrl.host,
//     hostname: nextUrl.hostname,
//     href: nextUrl.href,
//     detectedHost,
//     detectedXForwardedHost,
//   });

//   return NextResponse.rewrite(newHref);
// };

// export default middleware;

export default function middleware(_request: NextRequest) {
  return NextResponse.next();
}
