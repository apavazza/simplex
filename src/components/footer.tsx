import Link from "next/link"

export default function Footer() {
    return (
    <footer className="py-2 lg:py-4 relative bg-white border-t border-gray-200">
      <div className="px-4">
        <div className="flex flex-col lg:flex-row lg:relative items-center">
          <div className="order-2 lg:mx-auto">
            <p className="text-sm text-center">
              &copy; 2026 <Link
                            href={"https://github.com/apavazza"}
                            target="_blank"
                            rel="noreferrer"
                            className="text-gray-800 hover:text-gray-500"
                          >
                            Amadeo Pavazza
                          </Link>
                          . Licensed under the <Link
                                                  href={"https://github.com/apavazza/simplex/blob/master/LICENSE"}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className="text-gray-800 hover:text-gray-500"
                                                > GNU AGPLv3</Link>.
            </p>
          </div>

          <div className="order-1 lg:absolute lg:left-0">
            <div className="flex flex-row space-x-5 items-center">
                <Link
                    href={"https://github.com/apavazza/simplex/blob/master/LICENSE"}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-gray-800 hover:text-gray-500 whitespace-nowrap"
                >
                  AGPLv3 license
                </Link>
                <Link
                    href={"https://github.com/apavazza/simplex"}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-gray-800 hover:text-gray-500 whitespace-nowrap"
                >
                  Repository
                </Link>
            </div>
          </div>

          <div className="order-3 lg:absolute lg:right-0">
            <p className="text-sm text-gray-800">
              Version: {process.env.NEXT_PUBLIC_GIT_HASH ? (
                <Link
                  href={`https://github.com/apavazza/simplex/commits/${process.env.NEXT_PUBLIC_GIT_HASH}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-gray-500"
                >
                  {process.env.NEXT_PUBLIC_GIT_HASH}
                </Link>
              ) : "development"}
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}