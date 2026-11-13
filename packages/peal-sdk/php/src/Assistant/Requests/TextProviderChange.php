<?php

namespace Peal\Assistant\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Types\TextProviderKind;

class TextProviderChange extends JsonSerializableType
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
     * @var value-of<TextProviderKind> $kind
     */
    #[JsonProperty('kind')]
    public string $kind;

    /**
     * @var string $model
     */
    #[JsonProperty('model')]
    public string $model;

    /**
     * @param array{
     *   baseUrl: string,
     *   kind: value-of<TextProviderKind>,
     *   model: string,
     *   apiKey?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->apiKey = $values['apiKey'] ?? null;
        $this->baseUrl = $values['baseUrl'];
        $this->kind = $values['kind'];
        $this->model = $values['model'];
    }
}
