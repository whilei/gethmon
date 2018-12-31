var refereshInterval = 10*1000;

var rpcRequest = function(host, hostid, method, params, onSuccess, onError) {
	$("."+hostid+"."+method+".updates").text(" updating...").fadeIn(0.9*refereshInterval);

	// {"jsonrpc":"2.0","method":"eth_syncing","params":[],"id":1}
	var data = {
		jsonrpc: "2.0",
		method: method,
		params: params,
		id: Date.now()
	};
	return $.ajax({
		url: host,
		dataType: 'json',
		type: 'POST',
		contentType: 'application/json',
		data: JSON.stringify(data),
		success: onSuccess,
		error: onError,
	});
};

var buildEl = function(hostname, el, methodName) {
	return $(el)
		.addClass(hostname)
		.addClass(methodName)
		.css({
			"margin": "10"
		})
		.append(
			$("<strong><code></code></strong>").text(methodName)
		)
		.append(
			$("<span>initializing...</span>")
				.addClass("error")
				.addClass(hostname)
				.addClass(methodName)
				.css({
					"color": "red",
					// "float": "right"
				})
		)
		.append(
			$("<small></small>")
				.addClass("updates")
				.addClass(hostname)
				.addClass(methodName)
				.css({
					"color": "green",
					// "float": "right"
				})
		)
		.append(
			$("<div></div>")
				.addClass("res")
		)
		;
}

var arrWithLimitFIFO = function(arr, lim, item) {
	arr.push(item);
	if (arr.length > lim) {arr.shift();}
	return arr;
}

var d = {};

// preset options:
// - 'gray-area'
// - 'hilite-last'
// - 'hilite-peaks'
// - 'zero-bars'
// - 'binary'
var sparkOptions = sparky.presets.get("hilite-peaks", {
	width:  500,
	height: 50,
	dot_fill: function(d, i) {
		// return (this.first || this.last)
		return (this.last)
			? "#f00"
			: (this.min || this.max)
			  ? "#339ACF"
			  : "#ccc";
			//   : null;
	},
	dot_radius: function(d, i) {
		return (this.first || this.last || this.min || this.max)
		? 2
		: 2;
	}
});

var dataLoop = function(h) {

	var url = URI(h);
	var safeH = url.hostname()+url.port();

	if ($("#host-"+safeH).length > 0) {
		// $("#host"+safeH).html($container);
	} else {
		var $hostName = $("<h1></h1>").text("@"+h),
			$blockNumber = buildEl(safeH, "<div></div>", "eth_blockNumber"),
			$syncing = buildEl(safeH, "<div></div>", "eth_syncing"),
			$peers = buildEl(safeH, "<div></div>", "admin_peers");

		var $container = $("<div></div>")
			.attr("id", "host-"+safeH)
			.append($hostName)
			.append($blockNumber)
			.append($syncing)
			.append($peers)
			;
		$("#nodes").append($container);
	}

	var handleError = function(hostname, methodName, err) {
		console.log("err", methodName, err);
		$(".error."+hostname+"."+methodName).text(err).show();
		$("."+hostname+"."+methodName+".updates").fadeOut(10);
	};
	var handleOK = function(hostname, methodName) {
		$(".error."+hostname+"."+methodName).hide();
		var l = $("."+hostname+"."+methodName+".updates");
		l.append("OK").fadeOut(10);
	}

	rpcRequest(h, safeH, "eth_blockNumber", [], 
		function onOk(data) {
			d["eth_blockNumber"] = d["eth_blockNumber"] || []
			d["eth_blockNumber"] = arrWithLimitFIFO(d["eth_blockNumber"], 500, parseInt(data.result));
			$("#host-"+safeH+" .eth_blockNumber .res").html(`
			blockNumber: ${parseInt(data.result)} <span id="spark-${safeH}-eth_blockNumber"></span>
			<br>
			raw: <code> ${JSON.stringify(data.result, null, 4)} </code>
			`);
			sparky.sparkline($(`#spark-${safeH}-eth_blockNumber`)[0], d["eth_blockNumber"], sparkOptions);
			handleOK(safeH, "eth_blockNumber");
		},
		function onErr(err) {
			handleError(safeH, "eth_blockNumber", err);
		}
	);
	rpcRequest(h, safeH, "eth_syncing", [], 
		function onOk(data) {
			if (data.result === false) {
				$("#host-" + safeH + " .eth_syncing .res").html("false");
				$(".eth_syncing .error").hide();
				handleOK(safeH, "eth_syncing");
				return;
			}

			var html = `
			<table>
			<thead>
			<tr>
				<th>key</th><th>val</th><th>spark</th>
			</tr>
			</thead>
			<tbody>
			`;
			for (k in data.result) {
				if (!data.result.hasOwnProperty(k)) {
					continue;
				}

				d['eth_syncing'] = d['eth_syncing'] || {};
				d['eth_syncing'][k] = d['eth_syncing'][k] || [];
				d['eth_syncing'][k] = arrWithLimitFIFO(d['eth_syncing'][k], 500, parseInt(data.result[k]));

				html=html+`
				<tr>
				<td>${k}</td> <td>${parseInt(data.result[k])}</td> <td id="spark-${safeH}-eth_syncing-${k}"></td>
				</tr>

				<!-- <code>${JSON.stringify(d['eth_syncing'][k])}</code> -->
				`;
			}
			html=html+`
			</tbody>
			</table>
			raw: <code> ${JSON.stringify(data.result, null, 4)} </code>
			`;

			$("#host-" + safeH + " .eth_syncing .res").html(html);

			// fill in sparklines after appending the elements
			for (k in data.result) {
				if (!data.result.hasOwnProperty(k)) {
					continue;
				}
				sparky.sparkline($(`#spark-${safeH}-eth_syncing-${k}`)[0], d['eth_syncing'][k], sparkOptions);
			}

			$(".eth_syncing .error").hide();
			handleOK(safeH, "eth_syncing");
		},
		function onErr(err) {
			handleError(safeH, "eth_syncing", err);
		}
	);
	rpcRequest(h, safeH, "admin_peers", [], 
		function onOk(data) {
			var html = `
			# peers: ${data.result.length} <span id="spark-${safeH}-admin_peers-count"></span>
			<table style="font-size: 0.7em;">
			<thead>
			<tr>
				<th>name</th>
				<th>caps</th>
				<th>id</th>
				<th>network</th>
			</tr>
			</thead>
			<tbody>
			`;

			for (var i = 0; i < data.result.length; i++) {
				var p = data.result[i];
				html = html+`
				<tr>
					<td>${p.name}</td>
					<td>${JSON.stringify(p.caps)}</td>
					<td>${p.id.substring(6)}</td>
					<td>${JSON.stringify(p.network, null, 4)}</td>
				</tr>
				`;
			}
			html=html+`
			</tbody>
			</table>
			raw: <code>${JSON.stringify(data.result, null, 4).substring(0, 100)+"..."}</code> 
			`

			$("#host-" + safeH + " .admin_peers .res").html(html);

			d["admin_peers"] = d["admin_peers"] || [];
			d["admin_peers"] = arrWithLimitFIFO(d["admin_peers"], 500, data.result.length);
			sparky.sparkline($(`#spark-${safeH}-admin_peers-count`)[0], d["admin_peers"], sparkOptions);

			console.log(data);
			handleOK(safeH, "admin_peers");
		},
		function onErr(err) {
			handleError(safeH, "admin_peers", err);
		}
	);
};

$(function () {
	var pathname = window.location.hash;
	$(".this-location").text(window.location.host);
	var hosts = pathname.substring(1).split(",");
	for (var i = 0; i < hosts.length; i++) {
		(function(h) {
			console.log(h);
			dataLoop(h);
			setInterval(function() {
				dataLoop(h);
			}, refereshInterval);
		})(hosts[i]);
	}
});