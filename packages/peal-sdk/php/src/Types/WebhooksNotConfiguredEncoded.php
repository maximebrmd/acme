<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class WebhooksNotConfiguredEncoded extends JsonSerializableType
{
    /**
     * @var value-of<WebhooksNotConfiguredEncodedTag> $tag
     */
    #[JsonProperty('_tag')]
    public string $tag;

    /**
     * @param array{
     *   tag: value-of<WebhooksNotConfiguredEncodedTag>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->tag = $values['tag'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
