import { buildHcmoJsonFromContext } from '../../../lib/utils/preclinicalHcmo';

export default {
  HCMO_JSON: {
    fileType: 'json',
    status: 'published',
    exportAsJson: true,
    pertains_to: ['Experiment'],
    method: function (dh) {
      return buildHcmoJsonFromContext(dh.context);
    },
  },
};
