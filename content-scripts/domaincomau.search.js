// look at the URI for the address of the listing
if (window.location.hostname === 'www.domain.com.au') {
  // check if the page is a listing for a property
  // we don't want to run this script on a search page
  // there's a dedicated content script for that
  const ele = document.querySelector('div#__domain_group\\/APP_ROOT ul[data-testid="results"]');
  if (ele !== null) {
    execute();
  }
}

function execute () {
  let addresses = [];

  // before we start running requests, we need to insert some HTML into the page
  // we need different hooks based on what site we're on, not every website is created the same
  // this HTML is going to serve as our display to the user on what technology type
  // the listed property has
  switch (window.location.hostname) {
    case 'www.domain.com.au':
      addresses = getAddressesFromSearch();

      // create our temporary icon hook on each item
      addresses.forEach(async (address) => {
        const ele = insertNBNSearchItemIcon(address.iconHook);
        let technologyType = 'NULL';
        let colour = '#C2C2C2';
        try {
          const locationId = await queryBackendForLocationId(address.address);
          technologyType = await queryBackendForTechnologyType(locationId);
        } catch (Exception) {}

        switch (technologyType) {
          case 'NULL':
            technologyType = 'N/A';
            break;

          case 'FTTN':
            colour = '#F12C14';
            break;

          case 'HFC':
            colour = '#21E5E5';
            break;

          case 'FTTB':
            colour = '#99D529';
            break;

          case 'FTTP':
            colour = '#99D529';
            break;
        }

        updateNBNSearchItemIcon(ele, technologyType, colour);
      });
      break;

    default:
      break;
  }

  // insert our html element to show the result to the user
  // const ele = htmlElementToInsert(hook);

  // (async () => {
  //   // fetch the location id from the address on the page
  //   // then pass that to another request to get the technology type from the location id
  //   // finally we update our HTML element on the page with the type of
  //   // the technology the address is connected with
  //   const locationId = await queryBackendForLocationId(address);
  //   const technologyType = await queryBackendForTechnologyType(locationId);

  //   updateHtmlEleWithData(ele, technologyType);
  // })();
}

function getAddressesFromSearch () {
  const nodelist = document.querySelectorAll('ul[data-testid="results"] li[data-testid]');
  const elements = [];
  for (let i = 0; i < nodelist.length; i++) {
    elements.push(nodelist[i]);
  }

  return elements.map((element) => {
    // get the address inside each item
    const address = element.querySelector('div.listing-result__details a.listing-result__address meta[itemprop="name"]').getAttribute('content');
    const iconHook = element.querySelector('div.listing-result__features[data-testid="property-features"] div[data-testid="property-features-wrapper"]');

    return {
      address,
      iconHook
    };
  });
}

function insertNBNSearchItemIcon (hook) {
  const element = document.createElement('span');
  element.className = 'css-11e0ks6';
  element.innerHTML = `<span class="css-k9a40f">
  <i class="fas fa-spinner fa-spin css-gsqvet" style="width:14px;height:14px;"></i>
  <span data-testid="property-features-text" class="css-9fxapx">
    NBN
  </span>
</span>
<i class="fas fa-network-wired css-gsqvet" style="width:24px;height:24px;"></i>`;

  hook.append(element);
  return element;
}

function updateNBNSearchItemIcon (element, techType, colour) {
  element.style.color = colour;
  element.innerHTML = `<span class="css-k9a40f">
  ${techType}
  <span data-testid="property-features-text" class="css-9fxapx">
    NBN
  </span>
</span>
<i class="fas fa-network-wired css-gsqvet" style="width:24px;height:24px;"></i>`;
}
