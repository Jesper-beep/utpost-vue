const Button = ({ children, onClick }) => (
	<button
		type="button"
		onClick={onClick}
		style={{
			background: "#2f6fed",
			border: 0,
			color: "white",
			padding: "8px 14px",
		}}
	>
		{children}
	</button>
);

export default Button;
