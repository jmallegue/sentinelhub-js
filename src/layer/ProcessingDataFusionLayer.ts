import { BBox } from 'src/bbox';
import { GetMapParams, Interpolator, PreviewMode, ApiType, PaginatedTiles } from 'src/layer/const';
import {
  createProcessingPayload,
  convertPreviewToString,
  processingGetMap,
  MosaickingOrder,
  ProcessingPayloadDatasource,
} from 'src/layer/processing';
import { AbstractSentinelHubV3Layer } from 'src/layer/AbstractSentinelHubV3Layer';

/*
  This layer allows using Processing API "data fusion". It takes a list of layers and
  their accompanying parameters and allows us to call `getMap`. Note that `find*()`
  methods wouldn't make sense and are thus disabled.
*/
interface ConstructorParameters {
  evalscript: string;
  layers: DataFusionLayerInfo[];
  title?: string | null;
  description?: string | null;
}

export type DataFusionLayerInfo = {
  layer: AbstractSentinelHubV3Layer;
  id?: string;
  fromTime?: Date;
  toTime?: Date;
  preview?: PreviewMode;
  upsampling?: Interpolator;
  downsampling?: Interpolator;
};

export class ProcessingDataFusionLayer extends AbstractSentinelHubV3Layer {
  protected layers: DataFusionLayerInfo[];

  public constructor({ title = null, description = null, evalscript, layers }: ConstructorParameters) {
    super({ title, description, evalscript });
    this.layers = layers;
  }

  public async getMap(params: GetMapParams, api: ApiType): Promise<Blob> {
    if (api !== ApiType.PROCESSING) {
      throw new Error(`Only API type "PROCESSING" is supported`);
    }

    // when constructing the payload, we just take the first layer - we will rewrite its info later:
    const bogusFirstLayer = this.layers[0].layer;
    let payload = createProcessingPayload(bogusFirstLayer.dataset, params, this.evalscript);

    // replace payload.input.data with information from this.layers:
    payload.input.data = [];
    for (let i = 0; i < this.layers.length; i++) {
      const layerInfo = this.layers[i];
      let datasource: ProcessingPayloadDatasource = {
        dataFilter: {
          timeRange: {
            from: layerInfo.fromTime ? layerInfo.fromTime.toISOString() : params.fromTime.toISOString(),
            to: layerInfo.toTime ? layerInfo.toTime.toISOString() : params.toTime.toISOString(),
          },
          mosaickingOrder: MosaickingOrder.MOST_RECENT,
        },
        processing: {},
        type: layerInfo.layer.dataset.shProcessingApiDatasourceAbbreviation,
      };

      if (layerInfo.id !== undefined) {
        datasource.id = layerInfo.id;
      }

      if (layerInfo.preview !== undefined) {
        datasource.dataFilter.previewMode = convertPreviewToString(layerInfo.preview);
      } else if (params.preview !== undefined) {
        datasource.dataFilter.previewMode = convertPreviewToString(params.preview);
      }

      if (layerInfo.upsampling !== undefined) {
        payload.input.data[0].processing.upsampling = layerInfo.upsampling;
      } else if (params.upsampling !== undefined) {
        payload.input.data[0].processing.upsampling = params.upsampling;
      }

      if (layerInfo.downsampling !== undefined) {
        payload.input.data[0].processing.downsampling = layerInfo.downsampling;
      } else if (params.downsampling !== undefined) {
        payload.input.data[0].processing.downsampling = params.downsampling;
      }

      payload.input.data.push(datasource);
    }

    return processingGetMap(bogusFirstLayer.dataset.shServiceHostname, payload);
  }

  public supportsApiType(api: ApiType): boolean {
    return api === ApiType.PROCESSING;
  }

  public async findTiles(
    bbox: BBox, // eslint-disable-line @typescript-eslint/no-unused-vars
    fromTime: Date, // eslint-disable-line @typescript-eslint/no-unused-vars
    toTime: Date, // eslint-disable-line @typescript-eslint/no-unused-vars
    maxCount?: number, // eslint-disable-line @typescript-eslint/no-unused-vars
    offset?: number, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<PaginatedTiles> {
    throw new Error('Not supported - use individual layers when searching for tiles or flyovers');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async findDatesUTC(bbox: BBox, fromTime: Date, toTime: Date): Promise<Date[]> {
    throw new Error('Not supported - use individual layers when searching for available dates');
  }
}
