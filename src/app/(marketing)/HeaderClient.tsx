"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogPanel,
  Popover,
  PopoverButton,
  PopoverGroup,
  PopoverPanel,
} from "@headlessui/react";
import { ChevronDownIcon, PhoneIcon } from "@heroicons/react/20/solid";
import {
  Bars3Icon,
  ChartPieIcon,
  CursorArrowRaysIcon,
  FingerPrintIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { BarChart3 } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";

import { authClient } from "@/server/better-auth/client";

// Icon mapping for dynamic icon rendering
const iconMap = {
  ChartPieIcon,
  CursorArrowRaysIcon,
  FingerPrintIcon,
  PhoneIcon,
};

interface NavigationItem {
  name: string;
  href: string;
  description?: string;
  icon?: keyof typeof iconMap;
}

interface NavigationStructure {
  product: NavigationItem[];
  callsToAction: NavigationItem[];
  simple: NavigationItem[];
}

interface HeaderClientProps {
  navigation: NavigationStructure;
}

export default function HeaderClient({ navigation }: HeaderClientProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: session, isPending } = authClient.useSession();

  // Use real session state, but default to logged out during loading for marketing focus
  const isLoggedIn = isPending ? false : !!session?.user;

  const getIcon = (iconName: keyof typeof iconMap) => {
    return iconMap[iconName];
  };

  return (
    <>
      {/* Mobile Header - Auth Buttons + Menu */}
      <div className="flex items-center gap-x-2 lg:hidden">
        {isLoggedIn ? (
          <ButtonLink
            href="/app/dashboard"
            variant="default"
            size="sm"
            className="h-7 px-2.5 py-1.5 text-xs font-semibold"
          >
            Dashboard
          </ButtonLink>
        ) : (
          <>
            <ButtonLink
              href="/signin"
              variant="ghost"
              size="sm"
              className="h-7 px-2 py-1.5 text-xs font-semibold text-gray-900"
            >
              Sign in
            </ButtonLink>
            <ButtonLink
              href="/signup"
              variant="default"
              size="sm"
              className="h-7 px-2.5 py-1.5 text-xs font-semibold"
            >
              Get started
            </ButtonLink>
          </>
        )}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700"
        >
          <span className="sr-only">Open main menu</span>
          <Bars3Icon aria-hidden="true" className="size-6" />
        </button>
      </div>

      {/* Desktop Navigation */}
      <PopoverGroup className="hidden lg:flex lg:gap-x-12">
        {/* Temporarily hidden Product dropdown */}
        {/* <Popover className="relative">
          {({ close }) => (
            <>
              <PopoverButton className="text-foreground hover:text-primary hover:bg-muted/50 flex cursor-pointer items-center gap-x-1 rounded-full px-3 py-1.5 text-sm/6 font-semibold transition-all">
                Product
                <ChevronDownIcon
                  aria-hidden="true"
                  className="text-muted-foreground size-5 flex-none"
                />
              </PopoverButton>

              <PopoverPanel
                transition
                className="absolute left-1/2 z-10 mt-3 w-screen max-w-md -translate-x-1/2 overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-gray-900/5 transition data-closed:translate-y-1 data-closed:opacity-0 data-enter:duration-200 data-enter:ease-out data-leave:duration-150 data-leave:ease-in"
              >
                <div className="p-4">
                  {navigation.product.map((item) => {
                    const IconComponent = item.icon ? getIcon(item.icon) : null;
                    return (
                      <div
                        key={item.name}
                        className="group relative flex items-center gap-x-6 rounded-lg p-4 text-sm/6 hover:bg-gray-50"
                      >
                        {IconComponent && (
                          <div className="flex size-11 flex-none items-center justify-center rounded-lg bg-gray-50 group-hover:bg-white">
                            <IconComponent
                              aria-hidden="true"
                              className="size-6 text-gray-600 group-hover:text-blue-600"
                            />
                          </div>
                        )}
                        <div className="flex-auto">
                          <Link
                            href={item.href}
                            className="block font-semibold text-gray-900"
                            onClick={close}
                          >
                            {item.name}
                            <span className="absolute inset-0" />
                          </Link>
                          {item.description && (
                            <p className="mt-1 text-gray-600">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="grid grid-cols-1 divide-y divide-gray-900/5 bg-gray-50">
                  {navigation.callsToAction.map((item) => {
                    const IconComponent = item.icon ? getIcon(item.icon) : null;

                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className="flex items-center justify-center gap-x-2.5 p-3 text-sm/6 font-semibold text-gray-900 hover:bg-gray-100"
                        onClick={close}
                      >
                        {IconComponent && (
                          <IconComponent
                            aria-hidden="true"
                            className="size-5 flex-none text-gray-400"
                          />
                        )}
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              </PopoverPanel>
            </>
          )}
        </Popover> */}

        {navigation.simple.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="text-foreground hover:text-primary hover:bg-muted/50 rounded-full px-3 py-1.5 text-sm/6 font-semibold transition-all"
          >
            {item.name}
          </Link>
        ))}
      </PopoverGroup>

      {/* Desktop Auth Buttons */}
      <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:gap-x-4">
        {isLoggedIn ? (
          <ButtonLink
            href="/app/dashboard"
            variant="default"
            size="sm"
            className="text-sm/6 font-semibold"
          >
            Dashboard
          </ButtonLink>
        ) : (
          <>
            <ButtonLink
              href="/signin"
              variant="ghost"
              size="sm"
              className="text-sm/6 font-semibold text-gray-900"
            >
              Sign in
            </ButtonLink>
            <ButtonLink
              href="/signup"
              variant="default"
              size="sm"
              className="text-sm/6 font-semibold"
            >
              Sign up
            </ButtonLink>
          </>
        )}
      </div>

      {/* Mobile Navigation Dialog */}
      <Dialog
        open={mobileMenuOpen}
        onClose={setMobileMenuOpen}
        className="lg:hidden"
      >
        <div className="fixed inset-0 z-50" />
        <DialogPanel className="fixed inset-y-0 right-0 z-50 flex w-full flex-col justify-between overflow-y-auto bg-white/95 backdrop-blur-sm sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <Link
                href="/"
                className="flex items-center space-x-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
                  <BarChart3 className="size-4" />
                </div>
                <span className="text-xl font-bold">SwipeStats</span>
              </Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="-m-2.5 rounded-md p-2.5 text-gray-700"
              >
                <span className="sr-only">Close menu</span>
                <XMarkIcon aria-hidden="true" className="size-6" />
              </button>
            </div>
            <div className="mt-6 flow-root">
              <div className="-my-6 divide-y divide-gray-500/10">
                {/* Temporarily hidden Product items */}
                {/* <div className="space-y-2 py-6">
                  {navigation.product.map((item) => {
                    const IconComponent = item.icon ? getIcon(item.icon) : null;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className="group text-foreground hover:bg-muted/50 hover:text-primary -mx-3 flex items-center gap-x-6 rounded-lg p-3 text-base/7 font-semibold transition-all"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {IconComponent && (
                          <div className="bg-muted group-hover:bg-background flex size-11 flex-none items-center justify-center rounded-lg">
                            <IconComponent
                              aria-hidden="true"
                              className="text-muted-foreground group-hover:text-primary size-6"
                            />
                          </div>
                        )}
                        {item.name}
                      </Link>
                    );
                  })}
                </div> */}

                {/* Simple navigation items */}
                <div className="space-y-2 py-6">
                  {navigation.simple.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="text-foreground hover:bg-muted/50 hover:text-primary -mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold transition-all"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>

                {/* Auth buttons */}
                <div className="space-y-3 py-6">
                  {isLoggedIn ? (
                    <ButtonLink
                      href="/app/dashboard"
                      variant="default"
                      size="sm"
                      className="w-full justify-center text-base/7 font-semibold"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Dashboard
                    </ButtonLink>
                  ) : (
                    <>
                      <ButtonLink
                        href="/signin"
                        variant="ghost"
                        size="sm"
                        className="w-full justify-center text-base/7 font-semibold text-gray-900"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Sign in
                      </ButtonLink>
                      <ButtonLink
                        href="/signup"
                        variant="default"
                        size="sm"
                        className="w-full justify-center text-base/7 font-semibold"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Sign up
                      </ButtonLink>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Call to action buttons at bottom */}
          <div className="sticky bottom-0 grid grid-cols-1 divide-y divide-gray-900/5 bg-gray-50 text-center">
            {navigation.callsToAction.map((item) => {
              const IconComponent = item.icon ? getIcon(item.icon) : null;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center justify-center gap-x-2.5 p-3 text-base/7 font-semibold text-gray-900 hover:bg-gray-100"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {IconComponent && (
                    <IconComponent
                      aria-hidden="true"
                      className="size-5 flex-none text-gray-400"
                    />
                  )}
                  {item.name}
                </Link>
              );
            })}
          </div>
        </DialogPanel>
      </Dialog>
    </>
  );
}
