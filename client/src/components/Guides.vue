<script setup>
import GuideCard from "./GuideCard.vue";
</script>
<template>
    		<div>
			<h1>Guider</h1>
			<div className="searchrow">
				<input placeholder="Sök på namn eller landskap"/>
				<button type="button" className="btn-primary">
					Sök
				</button>
			</div>
			<div className="grid">
				// Render the guides here
                <GuideCard />
			</div>
		</div>


</template>
