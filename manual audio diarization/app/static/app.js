/**
 * Create a WaveSurfer instance.
 */

var wavesurfer;

audio_name = getUrlVars()["audio"];
annotation_name = audio_name.split('.')[0] + '.json'
let actors = [];

/**
 * Init & load.
 */
document.addEventListener('DOMContentLoaded', function () {
    // Init wavesurfer
    let options = {
        container: '#waveform',
        height: 100,
        pixelRatio: 1,
        scrollParent: true,
        normalize: true,
        backend: 'WebAudio',
		//minPxPerSec: 10,
        plugins: [
            WaveSurfer.regions.create(),
            WaveSurfer.timeline.create({
                container: '#wave-timeline'
            }),
            WaveSurfer.minimap.create({
                container: '#wave-minimap',
                waveColor: '#777',
                progressColor: '#222',
                height: 50
            }),
            WaveSurfer.cursor.create({
                showTime: true,
                opacity: 1,
                customShowTimeStyle: {
                    'background-color': '#000',
                    color: '#fff',
                    padding: '2px',
                    'font-size': '10px'
                }
            })
        ]
    };

    wavesurfer = WaveSurfer.create(options);
    wavesurfer.load('/audio/' + audio_name);
	
    /* Regions */
    wavesurfer.on('ready', function () {
        // wavesurfer.enableDragSelection({
        //     color: randomColor(0.6)
        // });

        wavesurfer.util
            .ajax({
                responseType: 'json',
                url: 'annotation/' + annotation_name
            })
            .on('success', function (data) {
                loadRegions(data);
                saveRegions();
            });
    });
    wavesurfer.on('region-click', function (region, e) {
        if (e.shiftKey) {
            e.stopPropagation();
            wavesurfer.skip(region.start - wavesurferGetCurrentTimeRound());
            region.play();
        }
    });
    wavesurfer.on('region-click', editAnnotation);
    wavesurfer.on('region-updated', saveRegions);
    wavesurfer.on('region-removed', saveRegions);
    wavesurfer.on('region-in', showNote);

    wavesurfer.on('region-play', function (region) {
        region.once('out', function () {
            // wavesurfer.play(region.start);
            wavesurfer.pause();
        });
    });
	
	let prevTime = 0;
	
    wavesurfer.drawer.on('click', function (e, progress) {
        // need to use setTimeout, because wavesurfer listen this event with setTimeout as follow:
        // Click-to-seek
        // this.drawer.on('click', (e, progress) => {
        //     setTimeout(() => this.seekTo(progress), 0);
        // });

        setTimeout(function () {
            if (curcorNotInRegion()) {
                if (e.shiftKey) {
                    // get the nearest prior region
                    //let sortedRegions = sortRegions(wavesurfer.regions.list);
                    let end = wavesurferGetCurrentTimeRound();
                    //let priorRegion = null;
                    let start = prevTime;
                    //let r;
                    //for (let i in sortedRegions) {
                    //    let r = sortedRegions[i];
                    //    if (r.end < end) {
                    //        priorRegion = r;
                    //    } else {
                    //        break;
                    //    }
                    //}
                    //if (priorRegion) {
                    //    start = priorRegion.end;
                    //} else {
                    //    start = 0;
                    //}
                    let segment = {
                        "start": start,
                        "end": end,
                        "data": ""
                    };
					console.log(segment);
                    segment.color = selectColor('');
                    segment.drag = false;
                    wavesurfer.addRegion(segment);
                    saveRegions();
                }
				else
				{
					prevTime = wavesurferGetCurrentTimeRound();
				}
            }
        }, 0);
    });

    /* Toggle play/pause buttons. */
    var playButton = document.querySelector('#play');
    var pauseButton = document.querySelector('#pause');
    wavesurfer.on('play', function () {
        playButton.style.display = 'none';
        pauseButton.style.display = '';
    });
    wavesurfer.on('pause', function () {
        playButton.style.display = '';
        pauseButton.style.display = 'none';
		prevTime = wavesurferGetCurrentTimeRound();
    });

    wavesurfer.regions.nextRegion = function () {
        console.log(this.getCurrentRegion().start);
    };

    wavesurfer.regions.priorRegion = function () {

    };
	
});

function curcorNotInRegion() {
    return true;
}


window.GLOBAL_ACTIONS['add-actor'] = function () {
	actorName = document.getElementById("newActor").value;
	document.getElementById("newActor").value = "";
	console.log(actorName != '');
	if (actorName != ''){
		actors.push({
		"name": actorName,
		"color": randomColor(0.5)
		});
		console.log(actors);
	}
	saveRegions();
}

window.GLOBAL_ACTIONS['delete-actor'] = function () {
	let selector = document.getElementById("actors");
	let actorToRemove = selector.options[selector.selectedIndex].value;
	let regionsData = {
        "actors": actors = actors.filter(actor => actor.name !== actorToRemove),
        "segments": Object.keys(wavesurfer.regions.list).map(function (id) {
            var region = wavesurfer.regions.list[id];
			console.log(region);
			if (region.data === actorToRemove) {
				region.data = {};
				region.color = 'rgba(0, 127, 255, 0.5)';
				region.update({
					start: region.start,
					end: region.end,
					data: region.data,
					color: region.color,  // for update render.
				});
			}
            return {
                start: region.start,
                end: region.end,
                actor: region.data
            };
        })
    };
    localStorage.regions = JSON.stringify(regionsData);
	updateSelector();
    saveAnnotationToServer();
}

function updateSelector() {
	document.getElementById("actors").innerHTML = "";
	let selector = document.getElementById('actors').options;
	actors.forEach(actor =>
		selector.add(
			new Option(actor.name, actor.name)
		)
	);
	
	document.getElementById("who").innerHTML = "";
	selector = document.getElementById('who').options;
	actors.forEach(actor =>
		selector.add(
			new Option(actor.name, actor.name)
		)
	);
}

/**
 * Save annotations to localStorage.
 */
function saveRegions() {
	let regionsData = {
        "actors": actors,
        "segments": Object.keys(wavesurfer.regions.list).map(function (id) {
            var region = wavesurfer.regions.list[id];
			console.log(region);
			
            return {
                start: region.start,
                end: region.end,
                actor: region.data
            };
        })
    };
    localStorage.regions = JSON.stringify(regionsData);
	updateSelector();
    saveAnnotationToServer();
}

/**
 * upload to server
 */
function saveAnnotationToServer() {
    let data = JSON.stringify({
        "actors": actors,
        "segments": Object.keys(wavesurfer.regions.list).map(function (id) {
            var region = wavesurfer.regions.list[id];
            return {
                start: region.start,
                end: region.end,
                actor: region.data
            };
        })
    });
    fetch("/annotation/" + annotation_name, {
        method: "POST",
        body: data
    }).then(res => {
        if (!res.ok) throw res;
        console.log("upload complete", annotation_name, res);
    }).catch(function (err) {
        console.log('Fetch Error :-S', err);
        alert('upload file error: ' + annotation_name)
    });
}

/**
 * Load regions from localStorage.
 */
function loadRegions(data) {
	actors = data.actors;
    data.segments.forEach(function (region) {
		region.data = region.actor;
        region.color = selectColor(region.actor);
        region.drag = false;
        wavesurfer.addRegion(region);
    });
	updateSelector();
}

/**
 * Изменить в соответствии с новым форматом данных +++++
 */
function sortRegions(fRegions) {
    // Return time-based regions
    let regions = Object.keys(wavesurfer.regions.list).map(function (id) {
        var region = wavesurfer.regions.list[id];
        return {
            start: region.start,
            end: region.end,
            actor: region.data
        };
    });
    return regions.sort(function (a, b) {
        return (a.start - b.start);
    });
}

window.GLOBAL_ACTIONS['extract-regions'] = function () {
	wavesurfer.clearRegions();
	var duration = wavesurfer.getDuration();
	var peaks = wavesurfer.backend.getPeaks(Math.floor(duration/0.005));
	var regions = extractRegions(peaks, duration);
	//console.log(regions)
	
	regions.forEach(function (region) {
		let segment = {
						"start": region.start,
						"end": region.end,
						"data": ""
					};
		segment.color = selectColor('');
		segment.drag = false;
		wavesurfer.addRegion(segment);
	});
	
	
	//var peaks = wavesurfer.backend.getPeaks(duration);

    saveRegions();
}

/**
 * Extract regions separated by silence.
 */
function extractRegions(peaks, duration) {
    // Silence params
    var minValue = 0.02;
    var minSeconds = 0.25;

    var length = peaks.length;
	
    var coef = duration / length;
    var minLen = minSeconds / coef;
	
    // Gather silence indeces
    var silences = [];
    Array.prototype.forEach.call(peaks, function (val, index) {
        if (Math.abs(val) <= minValue) {
            silences.push(index);
        }
    });

    // Cluster silence values
    var clusters = [];
    silences.forEach(function (val, index) {
        if (clusters.length && val == silences[index - 1] + 1) {
            clusters[clusters.length - 1].push(val);
        } else {
            clusters.push([val]);
        }
    });

    // Filter silence clusters by minimum length
    var fClusters = clusters.filter(function (cluster) {
        return cluster.length >= minLen;
    });

    // Create regions on the edges of silences
    var regions = fClusters.map(function (cluster, index) {
        var next = fClusters[index + 1];
        return {
            start: cluster[cluster.length - 1],
            end: next ? next[0] : length - 1
        };
    });

    // Add an initial region if the audio doesn't start with silence
    var firstCluster = fClusters[0];
    if (firstCluster && firstCluster[0] != 0) {
        regions.unshift({
            start: 0,
            end: firstCluster[firstCluster.length - 1]
        });
    }

    // Filter regions by minimum length
    var fRegions = regions.filter(function (reg) {
        return reg.end - reg.start >= minLen;
    });

    // Return time-based regions
    return fRegions.map(function (reg) {
        return {
            start: Math.round(reg.start * coef * 10) / 10,
            end: Math.round(reg.end * coef * 10) / 10
        };
    });
}

/**
 * Random RGBA color.
 */
function randomColor(alpha) {
    return (
        'rgba(' +
        [
            ~~(Math.random() * 255),
            ~~(Math.random() * 255),
            ~~(Math.random() * 255),
            alpha || 0.5
        ] +
        ')'
    );
}

/**
 *	Добавить выбор цвета на основе json`а
 */
function selectColor(actor_name) {
	// Найти актора по имени
	let actor = actors.find(function(actor) {
		return actor.name === actor_name;
	});

	// Если актор найден, вернуть его цвет
	if (actor) {
		return actor.color;
	} else {
	// Если актор не найден, вернуть базовое значение
		return 'rgba(0, 127, 255, 0.5)';
	}
}

function selectElement(id, valueToSelect) {
    let element = document.getElementById(id);
    element.value = valueToSelect;
}

/**
 * Edit app for a region.
 */
function editAnnotation(region) {
    var form = document.forms.edit;
    form.style.opacity = 1;
    (form.elements.start.value = Math.round(region.start * 10) / 10),
        (form.elements.end.value = Math.round(region.end * 10) / 10);
    // form.elements.note.value = region.data.note || '';
    selectElement('who', region.data || '');
    form.onsubmit = function (e) {
        e.preventDefault();
        region.update({
            start: form.elements.start.value,
            end: form.elements.end.value,
            data: form.elements.who.value,
            color: selectColor(form.elements.who.value),  // for update render.
        });
        form.style.opacity = 0;
    };
    form.onreset = function () {
        form.style.opacity = 0;
        form.dataset.region = null;
    };
    form.dataset.region = region.id;
}

/**
 * Display app.
 */
function showNote(region) {
    if (!showNote.el) {
        showNote.el = document.querySelector('#subtitle');
    }
    showNote.el.textContent = region.actor || '–';
}

/**
 * Bind controls.
 * Нажатие на кнопку Delete
 */
window.GLOBAL_ACTIONS['delete-region'] = function () {
    var form = document.forms.edit;
    var regionId = form.dataset.region;
    if (regionId) {
        wavesurfer.regions.list[regionId].remove();
        form.reset();
    }
};

/**
 * Display a base64 URL inside an iframe in another window to bypass Chrome security update of "prevent opening base64 URIs in the browser directly with JavaScript"
 * # Ref https://ourcodeworld.com/articles/read/682/what-does-the-not-allowed-to-navigate-top-frame-to-data-url-javascript-exception-means-in-google-chrome
 */
function debugBase64(base64URL) {
    var win = window.open();
    win.document.write('<iframe src="' + base64URL + '" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>');
}

window.GLOBAL_ACTIONS['export'] = function () {
    debugBase64(
        'data:application/json;charset=utf-8,' +
        encodeURIComponent(localStorage.regions)
    );
};

window.GLOBAL_ACTIONS['export-rttm'] = function () {
	let rttmData = '';
	regions = JSON.parse(localStorage.regions);
	regions.segments.forEach(segment => {
		console.log(segment);
		let actorName = segment.actor;
		let startValue = segment.start.toFixed(2);
		let endValue = segment.end.toFixed(2);
		let durationValue = (endValue - startValue).toFixed(2);
		if (endValue > startValue && actorName != ""){
			rttmData += `SPEAKER ${audio_name.split('.')[0]} 1 ${startValue} ${durationValue} <NA> <NA> ${actorName} <NA> <NA>\n`;
		}
	});
	console.log(rttmData);
	fetch("/rttm/" + audio_name.split('.')[0] + '.rttm', {
        method: "POST",
        body: rttmData
    }).then(res => {
        if (!res.ok) throw res;
        console.log("upload complete", audio_name.split('.')[0] + '.rttm', res);
    }).catch(function (err) {
        console.log('Fetch Error :-S', err);
        alert('upload file error: ' + audio_name.split('.')[0] + '.rttm')
    });
};

/**
 * getUrlVars
 */
function getUrlVars() {
    var vars = {};
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
        vars[key] = value;
    });
    return vars;
}

function wavesurferGetCurrentTimeRound() {
    return wavesurfer.getCurrentTime().toFixed(2);
}