<template>
	<span class="error-message">
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			fill="none"
			stroke="currentColor"
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-width="2"
			class="error-message__icon"
			viewBox="0 0 24 24"
			aria-hidden="true"
			focusable="false"
		>
			<circle cx="12" cy="12" r="10" />
			<path d="M12 8v4M12 16h.01" />
		</svg>
		<span class="error-message__text">
			<slot />
		</span>
	</span>
</template>

<style scoped>
.error-message {
	display: grid;
	grid-auto-flow: column;
	justify-self: start;
	align-items: center;
	column-gap: 0.5ch;
	font-size: 0.875rem;
	color: oklch(0.8675 0.0455 29.94);
}

.error-message__icon {
	inline-size: 1rem;
	block-size: 1rem;
	color: inherit;
}
</style>
