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
        $('#coinmama_btc_usd').html('$ ' + formatCurrency(data.coinmama_btc_usd));
        $('#coinmama_eth_usd').html('$ ' + formatCurrency(data.coinmama_eth_usd));
        // coinmama to clp
        $('#coinmama_btc_usd_clp').html('CLP ' + formatCurrency(data.coinmama_btc_usd * data.usd_clp));
        $('#coinmama_eth_usd_clp').html('CLP ' + formatCurrency(data.coinmama_eth_usd * data.usd_clp));

        // CMKT values
        $('#cmkt_eth_sell').html(formatCurrency(data.cmkt_eth_sell));
        $('#cmkt_eth_buy').html(formatCurrency(data.cmkt_eth_buy));

        // BUDA values
        $('#buda_btc_sell').html(formatCurrency(data.buda_btc_sell));
        $('#buda_btc_buy').html(formatCurrency(data.buda_btc_buy));

        // GDAX values
        $('#gdax_btc').html(formatCurrency(data.gdax_btc));
        $('#gdax_eth').html(formatCurrency(data.gdax_eth));

        // spank
        $('#spank').html(formatCurrency(data.spank));
        $('#spank_perc').html(data.spank_perc);

        // coinmama
        $('#coinmama_arbitrage_eth').html(formatCurrency(data.coinmama_arbitrage_eth));
        $('#coinmama_arbitrage_btc').html(formatCurrency(data.coinmama_arbitrage_btc));

        // buda / cmkt
        $('#buda_cmkt_arbitrage').html(formatCurrency(data.buda_cmkt_arbitrage));
        

        // format styles
        formatStyle('#spank_perc');
        formatStyle('#coinmama_arbitrage_eth');
        formatStyle('#coinmama_arbitrage_btc');
        formatStyle('#buda_cmkt_arbitrage');
        
    });
}

function formatCurrency(total) {
    const isNeg = total < 0;
    var neg = false;
    if(total < 0) {
        neg = true;
        total = Math.abs(total);
    }
    return (isNeg ? '-' : '') + parseFloat(total, 10).toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, "$1,").toString();
}

function formatStyle(selector) {
    // for mat coinmama arb
    $(selector).removeClass('negative').removeClass('positive');
    if ($(selector).html().indexOf('-') !== -1) {
        $(selector).addClass('negative');
    }else {
        $(selector).addClass('positive');
    }
}