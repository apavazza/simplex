import Link from "next/link"

export default function Footer() {
    return (
    <footer className="py-4 relative bg-white border-t border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex flex-col-reverse lg:flex-row items-center">
            <div className="space-x-5 lg:absolute lg:left-4">
                <Link
                    href={"https://github.com/apavazza/simplex/blob/master/LICENSE"}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-gray-800 hover:text-gray-500 mb-2 lg:mb-0"
                >
                    AGPLv3 license
                </Link>
                <Link
                    href={"https://github.com/apavazza/simplex"}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-gray-800 hover:text-gray-500 mb-2 lg:mb-0"
                >
                    Repository
                </Link>
            </div>
          <p className="text-sm w-full text-center">
            &copy; 2025 <Link
                          href={"https://amadeopavazza.from.hr/"}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-gray-800 hover:text-gray-500 mb-2 lg:mb-0"
                        >
                          Amadeo Pavazza
                        </Link>
                      . All rights reserved.
            </p>
        </div>
      </div>
    </footer>
  )
}