const INTERVAL = 20000;

$(document).ready( function() {

	fetchValues();
	setInterval(function(){
		fetchValues();
	}, INTERVAL);

});


function fetchValues(){
	$.get('/values/', function(data){
		
		$('#btc_usd').html(data.btcUSD);
		$('#eth_usd').html(data.ethUSD);

		$('#dgb_usd').html(data.dgbUSD);
		$('#xrp_usd').html(data.xrpUSD);

		$('#btc_clp').html(data.btcCLP);
		$('#eth_clp').html(data.ethCLP);
		$('#btc_eth').html(data.btcEth);
		$('#arbitrage1').html(data.arbitrage1);

		if(data.arbitrage1.indexOf('-') < 0){
			$('#arbitrage1').removeClass('negative').addClass('positive');			
		}else{
			$('#arbitrage1').removeClass('positive').addClass('negative');	
		}
	});
}