import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/vue";
import { afterEach, describe, expect, it } from "vitest";
import RichText from "../../src/components/RichText.vue";
import type { Block, TextRun } from "../../src/lib/notices.js";

// Brödtexten kommer som data. Testet visar att märken blir element vi har valt
// och att allt som står i texten förblir text, även när det ser ut som en tagg.
const createRun = (text: string, extra: Partial<TextRun> = {}): TextRun => ({
	bold: false,
	href: null,
	italic: false,
	text,
	...extra,
});

const createBlock = (kind: Block["kind"], text: string): Block => ({
	kind,
	runs: [createRun(text)],
});

afterEach(cleanup);

describe("RichText", () => {
	it("gör ett stycke per stycke, med fet, kursiv och länk som riktiga element", () => {
		const { container } = render(RichText, {
			props: {
				blocks: [
					{
						kind: "paragraph",
						runs: [
							createRun("Bron vid "),
							createRun("Storforsen", { bold: true }),
							createRun(" lagas. "),
							createRun("Läs mer", {
								href: "https://utpost.se/leder",
								italic: true,
							}),
						],
					},
					createBlock("paragraph", "Räkna med en omväg."),
				],
			},
		});

		expect(container.querySelectorAll("p")).toHaveLength(2);
		expect(screen.getByText("Storforsen").tagName).toBe("STRONG");
		const link = screen.getByRole("link", { name: "Läs mer" });
		expect(link).toHaveAttribute("href", "https://utpost.se/leder");
		expect(link.querySelector("em")).not.toBeNull();
	});

	it("gör rubriker till rubriker och listpunkter efter varandra till en lista", () => {
		const { container } = render(RichText, {
			props: {
				blocks: [
					createBlock("heading-2", "Om leden"),
					createBlock("heading-3", "Bra att veta"),
					createBlock("bullet-item", "Vindskydd"),
					createBlock("bullet-item", "Ingen service"),
					createBlock("number-item", "Parkera"),
				],
			},
		});

		expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
			"Om leden",
		);
		expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(
			"Bra att veta",
		);
		expect(container.querySelectorAll("ul")).toHaveLength(1);
		expect(container.querySelectorAll("ul > li")).toHaveLength(2);
		expect(container.querySelectorAll("ol > li")).toHaveLength(1);
	});

	it("gör en tagg i texten till text och inte till kod", () => {
		const { container } = render(RichText, {
			props: {
				blocks: [createBlock("paragraph", "<img src=x onerror=alert(1)>")],
			},
		});

		expect(container.querySelector("img")).toBeNull();
		expect(
			screen.getByText("<img src=x onerror=alert(1)>"),
		).toBeInTheDocument();
	});
});
