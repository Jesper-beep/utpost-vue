import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { API_URL } from "../api.js";

const GuideDetail = () => {
	const { slug } = useParams();
	const [guide, setGuide] = useState(null);

	useEffect(() => {
		fetch(`${API_URL}/guides/${slug}`)
			.then((r) => r.json())
			.then(setGuide);
	}, [slug]);

	if (!guide) return <p>Laddar...</p>;

	return (
		<article className="guide">
			<h1>{guide.title}</h1>
			<p className="muted">
				{guide.region} · {guide.difficulty} · {guide.length_km} km
			</p>
			<div>{guide.body_html.replace(/<[^>]*>/g, "")}</div>
		</article>
	);
};

export default GuideDetail;
