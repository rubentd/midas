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
		$('#btc_usd_perc').html(data.btcUSDPerc);

		$('#eth_usd').html(data.ethUSD);
		$('#eth_usd_perc').html(data.ethUSDPerc);

		$('#dgb_usd').html(data.dgbUSD);
		$('#dgb_usd_perc').html(data.dgbUSDPerc);

		$('#xrp_usd').html(data.xrpUSD);
		$('#xrp_usd_perc').html(data.xrpUSDPerc);

		$('#btc_clp').html(data.btcCLP);
		$('#eth_clp').html(data.ethCLP);

		$('#clp_btc').html(data.btcCLPSell);
		$('#clp_eth').html(data.clpETH);

		$('#btc_eth').html(data.btcEth);

		$('#arbitrage1').html(data.arbitrage1);
		$('#arbitrage2').html(data.arbitrage2);

		if(data.arbitrage1.indexOf('-') < 0){
			$('#arbitrage1').removeClass('negative').addClass('positive');			
		}else{
			$('#arbitrage1').removeClass('positive').addClass('negative');	
		}

		if(data.arbitrage2.indexOf('-') < 0){
			$('#arbitrage2').parent().removeClass('negative').addClass('positive');			
		}else{
			$('#arbitrage2').parent().removeClass('positive').addClass('negative');	
		}


		$('span.perc').each(function(){
			if($(this).html().indexOf('-') < 0){
				$(this).removeClass('negative').addClass('positive');			
			}else{
				$(this).removeClass('positive').addClass('negative');	
			}
		});
		
	});
}