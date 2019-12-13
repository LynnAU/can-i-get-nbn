// look at the URI for the address of the listing
const uri = window.location.pathname;
if (window.location.hostname === 'www.domain.com.au') {
  // check if the page is a listing for a property
  // we don't want to run this script on a search page
  // there's a dedicated content script for that
  const ele = document.querySelector('div#__domain_group\\/APP_ROOT div.listing-details__wrapper');
  if (ele !== null) {
    execute();
  }
}

function execute () {
  let address = '';
  let hook = null;

  // before we start running requests, we need to insert some HTML into the page
  // we need different hooks based on what site we're on, not every website is created the same
  // this HTML is going to serve as our display to the user on what technology type
  // the listed property has
  switch (window.location.hostname) {
    case 'www.domain.com.au':
      address = getAddressFromListing(uri);
      hook = getHtmlHook();
      break;

    default:
      break;
  }

  // insert our html element to show the result to the user
  const ele = insertNBNListingIcon(hook);

  (async () => {
    // fetch the location id from the address on the page
    // then pass that to another request to get the technology type from the location id
    // finally we update our HTML element on the page with the type of
    // the technology the address is connected with
    const locationId = await queryBackendForLocationId(address);
    const technologyType = await queryBackendForTechnologyType(locationId);

    updateNBNListingIcon(ele, technologyType);
  })();
}

function getAddressFromListing (uri) {
  // do a little formatting to the URI to clean things up
  // assume the last word/sequence of the pathname is an id listing for domain
  const split = uri.split('-');
  split.pop();

  // remove the first character because it'll contain the leading '/'
  split[0] = split[0].substring(1, split[0].length);
  return split.join(' ');
}

function getHtmlHook () {
  const ele = document.querySelector('div[data-testid="property-features-wrapper"]');
  return ele;
}

function insertNBNListingIcon (hook) {
  const element = document.createElement('span');
  element.className = 'css-13ofb2n';
  element.innerHTML = `<span class="css-1ao68z6">
  <span data-testid="property-features-text" class="css-xotm2h">
    - NBN
  </span>
</span>
<i class="fas fa-spinner fa-spin css-gsqvet" style="width:24px;height:24px;"></i>`;

  hook.append(element);
  return element;
}

function updateNBNListingIcon (element, techType) {
  element.innerHTML = `<span class="css-1ao68z6">
  <span data-testid="property-features-text" class="css-xotm2h">
    ${techType} NBN
  </span>
</span>
<i class="fas fa-network-wired css-gsqvet" style="width:24px;height:24px;"></i>`;
}
