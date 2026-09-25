<script setup>
</script>
<template>
    		<div>
			<h1>{tour.title}</h1>
			<p className="muted">
				{Math.round(tour.distance_m / 100) / 10} km · {tour.logs.length}{" "}
				mätpunkter · {climb} höjdmeter
			</p>
			<p></p>
			<h2>Mätpunkter</h2>
			<ol className="logs">
				
			</ol>
		</div>
</template>