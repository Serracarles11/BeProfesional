"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { motion, useInView } from "motion/react"
import "./AnimatedList.css"

type AnimatedItemProps = {
  children: ReactNode
  delay?: number
  index: number
  onMouseEnter: () => void
  onClick: () => void
}

function AnimatedItem({
  children,
  delay = 0,
  index,
  onMouseEnter,
  onClick,
}: AnimatedItemProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const inView = useInView(ref, { amount: 0.5, once: false })

  return (
    <motion.div
      ref={ref}
      data-index={index}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      initial={{ scale: 0.7, opacity: 0 }}
      animate={inView ? { scale: 1, opacity: 1 } : { scale: 0.7, opacity: 0 }}
      transition={{ duration: 0.2, delay }}
      className="animated-list-motion-item"
    >
      {children}
    </motion.div>
  )
}

type AnimatedListProps<T> = {
  items: T[]
  renderItem: (item: T, index: number, selected: boolean) => ReactNode
  onItemSelect?: (item: T, index: number) => void
  showGradients?: boolean
  enableArrowNavigation?: boolean
  className?: string
  itemClassName?: string
  displayScrollbar?: boolean
  initialSelectedIndex?: number
}

export default function AnimatedList<T>({
  items,
  renderItem,
  onItemSelect,
  showGradients = true,
  enableArrowNavigation = true,
  className = "",
  itemClassName = "",
  displayScrollbar = true,
  initialSelectedIndex = -1,
}: AnimatedListProps<T>) {
  const listRef = useRef<HTMLDivElement | null>(null)
  const keyboardNavRef = useRef(false)
  const [selectedIndex, setSelectedIndex] = useState(initialSelectedIndex)
  const [topGradientOpacity, setTopGradientOpacity] = useState(0)
  const [bottomGradientOpacity, setBottomGradientOpacity] = useState(1)

  const handleItemMouseEnter = useCallback((index: number) => {
    setSelectedIndex(index)
  }, [])

  const handleItemClick = useCallback(
    (item: T, index: number) => {
      setSelectedIndex(index)
      onItemSelect?.(item, index)
    },
    [onItemSelect]
  )

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget
    setTopGradientOpacity(Math.min(scrollTop / 50, 1))
    const bottomDistance = scrollHeight - (scrollTop + clientHeight)
    setBottomGradientOpacity(scrollHeight <= clientHeight ? 0 : Math.min(bottomDistance / 50, 1))
  }, [])

  useEffect(() => {
    if (!enableArrowNavigation) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown" || (event.key === "Tab" && !event.shiftKey)) {
        event.preventDefault()
        keyboardNavRef.current = true
        setSelectedIndex((previous) => Math.min(previous + 1, items.length - 1))
      } else if (event.key === "ArrowUp" || (event.key === "Tab" && event.shiftKey)) {
        event.preventDefault()
        keyboardNavRef.current = true
        setSelectedIndex((previous) => Math.max(previous - 1, 0))
      } else if (event.key === "Enter" && selectedIndex >= 0 && selectedIndex < items.length) {
        event.preventDefault()
        onItemSelect?.(items[selectedIndex], selectedIndex)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [items, selectedIndex, onItemSelect, enableArrowNavigation])

  useEffect(() => {
    if (!keyboardNavRef.current || selectedIndex < 0 || !listRef.current) return

    const container = listRef.current
    const selectedItem = container.querySelector<HTMLElement>(`[data-index="${selectedIndex}"]`)
    if (selectedItem) {
      const extraMargin = 50
      const containerScrollTop = container.scrollTop
      const containerHeight = container.clientHeight
      const itemTop = selectedItem.offsetTop
      const itemBottom = itemTop + selectedItem.offsetHeight

      if (itemTop < containerScrollTop + extraMargin) {
        container.scrollTo({ top: itemTop - extraMargin, behavior: "smooth" })
      } else if (itemBottom > containerScrollTop + containerHeight - extraMargin) {
        container.scrollTo({
          top: itemBottom - containerHeight + extraMargin,
          behavior: "smooth",
        })
      }
    }

    keyboardNavRef.current = false
  }, [selectedIndex])

  return (
    <div className={`animated-list-container ${className}`}>
      <div
        ref={listRef}
        className={`animated-list-scroll ${!displayScrollbar ? "animated-list-no-scrollbar" : ""}`}
        onScroll={handleScroll}
      >
        {items.map((item, index) => (
          <AnimatedItem
            key={index}
            delay={0.04}
            index={index}
            onMouseEnter={() => handleItemMouseEnter(index)}
            onClick={() => handleItemClick(item, index)}
          >
            <div className={`animated-list-item ${selectedIndex === index ? "selected" : ""} ${itemClassName}`}>
              {renderItem(item, index, selectedIndex === index)}
            </div>
          </AnimatedItem>
        ))}
      </div>
      {showGradients ? (
        <>
          <div className="animated-list-top-gradient" style={{ opacity: topGradientOpacity }} />
          <div className="animated-list-bottom-gradient" style={{ opacity: bottomGradientOpacity }} />
        </>
      ) : null}
    </div>
  )
}
