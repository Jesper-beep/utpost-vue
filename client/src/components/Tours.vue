<script setup>
import Tours from "./ToursDetail.vue";
</script>
<template>
    		<div>
			<h1>Turer</h1>
			<table className="tours">
				<thead>
					<tr>
						<th>Tur</th>
						<th>Av</th>
						<th>Guide</th>
						<th>Längd</th>
						<th>Bilder</th>
                        <th>OK?</th>
					</tr>
				</thead>
				<tbody>
                    <Tours />
					<!-- {tours.map((t) => (
						<tr key={t.id}>
							<td>
								<Link to={`/turer/${t.id}`}>{t.title}</Link>
							</td>
							<td>{t.user?.display_name}</td>
							<td>{t.guide ? t.guide.title : "-"}</td>
							<td>{Math.round(t.distance_m / 100) / 10} km</td>
							<td>{t.photos.length}</td>
						</tr>
					))} -->
				</tbody>
			</table>
		</div>

</template>
<script>
</script>