import 'jest-setup';
import axios from 'src/layer/__mocks__/axios';

import { BBox, CRS_EPSG4326, ApiType, MimeTypes, WmsLayer, setAuthToken } from 'src';

test('WmsLayer.getMapUrl returns an URL', () => {
  const bbox = new BBox(CRS_EPSG4326, 19, 20, 20, 21);
  const layerId = 'PROBAV_S1_TOA_333M';
  const layer = new WmsLayer({
    baseUrl: 'https://proba-v-mep.esa.int/applications/geo-viewer/app/geoserver/ows',
    layerId,
  });

  const getMapParams = {
    bbox: bbox,
    fromTime: new Date(Date.UTC(2020, 1 - 1, 10, 0, 0, 0)), // 2020-01-10/2020-01-10
    toTime: new Date(Date.UTC(2020, 1 - 1, 10, 23, 59, 59)),
    width: 512,
    height: 512,
    format: MimeTypes.JPEG,
  };
  const imageUrl = layer.getMapUrl(getMapParams, ApiType.WMS);

  expect(imageUrl).toHaveOrigin('https://proba-v-mep.esa.int');
  expect(imageUrl).toHaveQueryParamsValues({
    service: 'WMS',
    version: '1.1.1',
    request: 'GetMap',
    format: 'image/jpeg',
    layers: layerId,
    srs: 'EPSG:4326',
    bbox: '19,20,20,21',
    time: '2020-01-10T00:00:00Z/2020-01-10T23:59:59Z',
    width: '512',
    height: '512',
  });
  expect(imageUrl).not.toHaveQueryParams(['showlogo']);
  expect(imageUrl).not.toHaveQueryParams(['transparent']);
});

test('WmsLayer.getMap makes an appropriate request', () => {
  const bbox = new BBox(CRS_EPSG4326, 19, 20, 20, 21);
  const layerId = 'PROBAV_S1_TOA_333M';
  const layer = new WmsLayer({
    baseUrl: 'https://proba-v-mep.esa.int/applications/geo-viewer/app/geoserver/ows',
    layerId,
  });

  const getMapParams = {
    bbox: bbox,
    fromTime: new Date(Date.UTC(2020, 1 - 1, 10, 0, 0, 0)), // 2020-01-10/2020-01-10
    toTime: new Date(Date.UTC(2020, 1 - 1, 10, 23, 59, 59)),
    width: 512,
    height: 512,
    format: MimeTypes.JPEG,
  };
  layer.getMap(getMapParams, ApiType.WMS);

  expect(axios.get).toHaveBeenCalledTimes(1);

  const call: any = axios.get.mock.calls[0]; // cast to `any` so we can access the parameters
  const [url, axiosParams] = call;

  expect(url).toHaveOrigin('https://proba-v-mep.esa.int');
  expect(url).toHaveQueryParamsValues({
    service: 'WMS',
    version: '1.1.1',
    request: 'GetMap',
    format: 'image/jpeg',
    layers: layerId,
    srs: 'EPSG:4326',
    bbox: '19,20,20,21',
    time: '2020-01-10T00:00:00Z/2020-01-10T23:59:59Z',
    width: '512',
    height: '512',
  });
  expect(axiosParams).toEqual({
    responseType: typeof window !== 'undefined' && window.Blob ? 'blob' : 'arraybuffer',
    useCache: true,
  });
});

test('WmsLayer.findDates should not include auth token in GetCapabilities request', () => {
  axios.get.mockReset();
  const layerId = 'PROBAV_S1_TOA_333M';
  const layer = new WmsLayer({
    baseUrl: 'https://proba-v-mep.esa.int/applications/geo-viewer/app/geoserver/ows',
    layerId,
  });
  const bbox = new BBox(CRS_EPSG4326, 19, 20, 20, 21);
  const fromTime = new Date(Date.UTC(2020, 1 - 1, 10, 0, 0, 0));
  const toTime = new Date(Date.UTC(2020, 1 - 1, 10, 23, 59, 59));

  setAuthToken('asdf1234'); // this should not have any effect

  layer.findDatesUTC(bbox, fromTime, toTime);

  expect(axios.get).toHaveBeenCalledTimes(1);

  const call: any = axios.get.mock.calls[0]; // cast to `any` so we can access the parameters
  const [url, axiosParams] = call;

  expect(url).toHaveOrigin('https://proba-v-mep.esa.int');
  expect(url).toHaveQueryParamsValues({
    service: 'wms',
    request: 'GetCapabilities',
    format: 'text/xml',
  });
  expect(axiosParams).toEqual({
    responseType: 'text',
    useCache: true,
  });
});
