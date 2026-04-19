import { useEffect, useRef, useState } from 'react';

function MenuItem({ children, onClick, ...rest }) {
  return (
    <li role="none">
      <button type="button" className="dropdown-item" role="menuitem" onClick={onClick} {...rest}>
        {children}
      </button>
    </li>
  );
}

/** Header menu: button + dropdown list; closes on outside click. */
export function MenuDropdown({
  buttonLabel = `Menu \u25BC`,
  menuButtonId = 'menu-button',
  items = [],
  size = 'small',
  onHoverLong = null,
  onNearMissClick = null,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const buttonRef = useRef(null);
  const hoverTimerRef = useRef(null);

  useEffect(() => {
    function onDocMouseDown(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }

      if (!buttonRef.current || buttonRef.current.contains(event.target)) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const x = event.clientX;
      const y = event.clientY;
      const nearPadding = 70;
      const isNear =
        x >= rect.left - nearPadding &&
        x <= rect.right + nearPadding &&
        y >= rect.top - nearPadding &&
        y <= rect.bottom + nearPadding;
      if (isNear) onNearMissClick?.();
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [onNearMissClick]);

  function handleMouseEnter() {
    hoverTimerRef.current = window.setTimeout(() => {
      onHoverLong?.();
    }, 2500);
  }

  function handleMouseLeave() {
    if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = null;
  }

  return (
    <div className="header-actions" ref={ref}>
      <div className="dropdown-wrap">
        {/*
          Linger tracking only on the menu button + padded hit area — not the open dropdown list.
        */}
        <div
          className="dropdown-hover-zone"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <button
            type="button"
            className={`dropdown-button dropdown-button--${size}`}
            data-ui-element-id="Menu_Dropdown_Button"
            id={menuButtonId}
            ref={buttonRef}
            aria-haspopup="true"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {buttonLabel}
          </button>
        </div>
        {open ? (
          <ul className="dropdown-panel" role="menu" aria-labelledby={menuButtonId}>
            {items.map((item) => (
              <MenuItem
                key={item.label}
                onClick={() => {
                  item.onClick?.();
                  setOpen(false);
                }}
              >
                {item.label}
              </MenuItem>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

export function AppHeader({ title, left, right = null }) {
  return (
    <header className="App-header">
      <div className="app-header-slot app-header-slot--left">{left}</div>
      <h1>{title}</h1>
      <div className="app-header-slot app-header-slot--right">{right}</div>
    </header>
  );
}
