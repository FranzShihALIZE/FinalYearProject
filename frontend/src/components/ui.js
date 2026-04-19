import { useId } from 'react';

/** Full-width sidebar row (profile, workspace links). */
export function SidebarNavButton({
  children,
  isSelected,
  onClick,
  className,
  selectedClassName,
  selectionMode = 'pressed',
  ...rest
}) {
  const combined = isSelected ? `${className} ${selectedClassName}` : className;
  const a11y =
    selectionMode === 'current'
      ? { 'aria-current': isSelected ? 'true' : undefined }
      : { 'aria-pressed': isSelected };

  return (
    <button type="button" className={combined} onClick={onClick} {...a11y} {...rest}>
      {children}
    </button>
  );
}

/** Shared mapped sidebar nav list using SidebarNavButton rows. */
export function SidebarNavList({
  items,
  getKey,
  getLabel,
  isSelected,
  onSelect,
  className,
  selectedClassName,
  selectionMode = 'pressed',
  containerClassName,
  ariaLabel,
}) {
  return (
    <div className={containerClassName} role="group" aria-label={ariaLabel}>
      {items.map((item) => {
        const key = getKey(item);
        const label = getLabel(item);
        return (
          <SidebarNavButton
            key={key}
            isSelected={isSelected(item)}
            onClick={() => onSelect(item)}
            className={className}
            selectedClassName={selectedClassName}
            selectionMode={selectionMode}
          >
            {label}
          </SidebarNavButton>
        );
      })}
    </div>
  );
}

/** Shared split layout page shell (left sidebar + right content). */
export function TwoPanePage({ ariaLabel, mainClassName, pageClassName, left, right }) {
  return (
    <main className={`home-main ${mainClassName}`.trim()} aria-label={ariaLabel}>
      <section className={pageClassName}>
        {left}
        {right}
      </section>
    </main>
  );
}

/** Title + optional description in the bordered “context” card (workspace). */
export function ContextInfoCard({ title, description }) {
  const titleId = useId();
  return (
    <div className="workspace-context-label" role="region" aria-labelledby={titleId}>
      <h2 id={titleId} className="workspace-context-label-title">
        {title}
      </h2>
      {description ? <p className="workspace-context-label-text">{description}</p> : null}
    </div>
  );
}

/** + / × actions in compact forms. */
export function FormIconButton({ variant = 'add', children, className = '', ...rest }) {
  const extra = variant === 'cancel' ? 'workspace-icon-button--cancel' : 'workspace-icon-button--add';
  return (
    <button type="button" className={`workspace-icon-button ${extra} ${className}`.trim()} {...rest}>
      {children}
    </button>
  );
}

/** Shared search field (home hero, browse page, etc.). */
export function SearchField({
  inputId = 'search',
  name = 'q',
  placeholder = 'Search…',
  label = 'Search',
  onSubmit,
}) {
  function handleSubmit(event) {
    event.preventDefault();
    onSubmit?.(event);
  }

  return (
    <form className="home-search" role="search" onSubmit={handleSubmit}>
      <label htmlFor={inputId} className="visually-hidden">
        {label}
      </label>
      <input
        id={inputId}
        name={name}
        type="search"
        placeholder={placeholder}
        autoComplete="off"
      />
    </form>
  );
}
