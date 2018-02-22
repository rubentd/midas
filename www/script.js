const INTERVAL = 20000;

$(document).ready( function() {
    fetchValues();
	setInterval(function(){
		fetchValues();
	}, INTERVAL);
});

function fetchValues() {
    $.get('/values/', function(data) {

        // Coinmama values
        $('#coinmama_btc_usd').html(formatCurrency(data.coinmama_btc_usd));
        $('#coinmama_eth_usd').html(formatCurrency(data.coinmama_eth_usd));

    });
}

function formatCurrency(total) {
    var neg = false;
    if(total < 0) {
        neg = true;
        total = Math.abs(total);
    }
    return parseFloat(total, 10).toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, "$1,").toString();
}