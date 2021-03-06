var ajax_cf;

jQuery(function() {
  // Flickr Key
  var apiKey = 'd924f5ea2a765922fc8794b3f9942133';
  // How many photos to return per flickr API request
  var FLICKR_PER_PAGE = '100'
  // ContentFlow for images
  ajax_cf = new ContentFlow('ajax_cf',{
    circularFlow: false,
    startItem: 'last',
    flowSpeedFactor: 3.0,
    flowDragFriction: 2.0,
    onclickActiveItem: function() {}, // don't open link?
    onReachTarget: function(obj) {
      if ((this.getNumberOfItems() > FLICKR_PER_PAGE/2) && 
           this.getActiveItem() == this.getItem(0)) {
        search();

      if (this._slideshow_stoped && !this._slideshow_locked) {
        this._startSlideshow();
        }
      }
    },
    onDrawItem: function(obj) {
      var img = obj.element.childNodes[0];
      if (img.height > 1000) {
        var i = obj.index;
        ajax_cf.rmItem(i);
      }
    }
  });

  var baseUrl = 'https://api.flickr.com/services/rest/?jsoncallback=?';
  var flickrOptions = {
    method: 'flickr.photos.search',
    api_key: apiKey,
    min_taken_date: getQueryVar('min_date'),
    max_taken_date: getQueryVar('max_date'),
    lat: getQueryVar('lat'),
    lon: getQueryVar('lng'),
    radius: (getQueryVar('dist')/1000),
    tag_mode: 'all',
    sort: 'date-taken-desc',
    extras: 'date_taken, url_l, url_c, url_z, url_n',
    format: 'json',
    per_page: FLICKR_PER_PAGE, 
    page: '1'
  }
  if (getQueryVar('tags') != '') {
    flickrOptions.tags = getQueryVar('tags').replace(/%20/g,"");
    flickrOptions.tag_mode = getQueryVar('tag_mode');
  }

  var count = 0;
  changedTotalResults = false;
  search();

  function search() {
    // Performs request using API (REST method) to flickr
    jQuery.getJSON(baseUrl, flickrOptions, function(data) {
      if (data.photos.photo.length == 0 && flickrOptions['page'] == 1) {
        document.getElementById('ajax_cf').innerHTML = '<center style="color:#000000">No images found. <p>Try different search criteria.</p></center>';
        // display no photos and do stuff to show no that there are no results
      } else {
        if (!changedTotalResults) {
          var numResults = data.photos.total;
          var string = document.getElementById('location').innerHTML;
          var newString = string.replace("Showing", "Showing " + numResults + " ");
          document.getElementById('location').innerHTML = newString;
          changedTotalResults = true;
        }
        // for each photo object returned
        jQuery.each(data.photos.photo, function(index, item) {
          // put repetitive data into variables
          var photoDateTime = item.datetaken;
          var photoDateTimeArray = photoDateTime.split(" ");
          // formulate urls for the photo
          var photoUrl = 'http://farm' + item.farm + '.static.flickr.com/' + 
                         item.server + '/' + item.id + '_' + item.secret + '_m.jpg';
          var photoSourceUrl = 'http://flickr.com/photos/' + item.owner + '/' + item.id;
          
          // Find the largest existing out of m, n, z, c
          var largePhotoUrl = "";
          if (item.url_l) {
            largePhotoUrl = item.url_l;
          } else if (item.url_c) { 
            largePhotoUrl = item.url_c; 
          } else if (item.url_z) { 
            largePhotoUrl = item.url_z; 
          } else if (item.url_n) { 
            largePhotoUrl = item.url_n; 
          } else { 
            largePhotoUrl = photoUrl; 
          }
          // The 'item' element (for the contentflow)
          var boxDom = document.createElement("A");
          boxDom.setAttribute("class", "fancybox item");
          boxDom.setAttribute("rel", "gallery");
          boxDom.setAttribute("href", largePhotoUrl);
          boxDom.setAttribute("title", item.title + " (" + item.datetaken + ")");
          boxDom.setAttribute("source", photoSourceUrl);
          // The 'image' element
          var imgDom = document.createElement("IMG");
          imgDom.setAttribute("class", "content");
          imgDom.setAttribute("alt", item.title + " (" + photoDateTime + ")");
          imgDom.src = photoUrl;
          // slider label
          var sliderLabelDom = document.createElement('div');
          sliderLabelDom.setAttribute("class", "label");
          sliderTextDom = document.createTextNode(photoDateTimeArray[0]);
          sliderLabelDom.appendChild(sliderTextDom);
          // attach them all together
          boxDom.appendChild(imgDom);
          boxDom.appendChild(sliderLabelDom);
//            console.log(boxDom.innerHTML);
          ajax_cf.addItem(boxDom, 'first');

          // once all the items from current page have been returned
          // get items from next page
          // NEED TO CHANGE TO next page on end of scroll... else will load 4eva
          if (++count == data.photos.photo.length) {
            flickrOptions['page']++;
            count = 0;
          }
        });
        
      }
    });
  }
  
});


// returns the value of the specified query parameter
function getQueryVar(variable) {
  var query = window.location.search.substring(1);
  var vars = query.split("&");
  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split("=");
    if (pair[0] == variable){
      return pair[1];
    }
  }
  return(false);
}

/* hacky way to make gallery buttons work in the middle of the gallery*/
/* DOESN'T WORK ON ENDS */

$.fancybox.next = function ( direction ) {
    if ($.fancybox.current) {
        $.fancybox.jumpto($.fancybox.current.index -1, 'left', 'prev');
        ajax_cf.moveTo('right');
    }
};

$.fancybox.prev = function ( direction ) {
    if ($.fancybox.current) {
        $.fancybox.jumpto($.fancybox.current.index + 1, 'right', 'next');
        ajax_cf.moveTo('left');
    }
};


function updateLocation() {
  var gc = new google.maps.Geocoder();
  var latlng = {'lat': Number(getQueryVar('lat')) , 'lng': Number(getQueryVar('lng'))}
  gc.geocode({'location': latlng}, function(results, status) {
    if (status == google.maps.GeocoderStatus.OK) {
      start = results[0].address_components[0].short_name;
      if (results.length > 1 && (/\d$/.test(start) || /^\d/.test(start))) {
        document.getElementById('location').innerHTML = "Showing results from " + results[1].formatted_address;
      } else {
        document.getElementById('location').innerHTML  = "Showing results from " + results[0].formatted_address;
      }
    } else {
      document.getElementById('location').innerHTML = "Showing results from an unknown location...";
    }
  });
}
