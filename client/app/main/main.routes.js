'use strict';

export default function routes($stateProvider) {
  'ngInject';

  $stateProvider.state('main', {
    url: '/:mode',
    template: '<main></main>'
  });
}
