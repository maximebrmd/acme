<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class TextProvider extends JsonSerializableType
{
    /**
     * @var string $baseUrl
     */
    #[JsonProperty('baseUrl')]
    public string $baseUrl;

    /**
     * @var bool $keySet
     */
    #[JsonProperty('keySet')]
    public bool $keySet;

    /**
     * @var bool $keyUnreadable
     */
    #[JsonProperty('keyUnreadable')]
    public bool $keyUnreadable;

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
     * @var string $updatedAt
     */
    #[JsonProperty('updatedAt')]
    public string $updatedAt;

    /**
     * @param array{
     *   baseUrl: string,
     *   keySet: bool,
     *   keyUnreadable: bool,
     *   kind: value-of<TextProviderKind>,
     *   model: string,
     *   updatedAt: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->baseUrl = $values['baseUrl'];
        $this->keySet = $values['keySet'];
        $this->keyUnreadable = $values['keyUnreadable'];
        $this->kind = $values['kind'];
        $this->model = $values['model'];
        $this->updatedAt = $values['updatedAt'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
