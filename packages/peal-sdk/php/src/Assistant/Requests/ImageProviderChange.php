<?php

namespace Peal\Assistant\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ImageProviderChange extends JsonSerializableType
{
    /**
     * @var ?string $apiKey
     */
    #[JsonProperty('apiKey')]
    public ?string $apiKey;

    /**
     * @var string $baseUrl
     */
    #[JsonProperty('baseUrl')]
    public string $baseUrl;

    /**
     * @var string $model
     */
    #[JsonProperty('model')]
    public string $model;

    /**
     * @param array{
     *   baseUrl: string,
     *   model: string,
     *   apiKey?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->apiKey = $values['apiKey'] ?? null;
        $this->baseUrl = $values['baseUrl'];
        $this->model = $values['model'];
    }
}
