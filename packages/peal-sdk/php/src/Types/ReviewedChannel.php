<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ReviewedChannel extends JsonSerializableType
{
    /**
     * @var string $channelId
     */
    #[JsonProperty('channelId')]
    public string $channelId;

    /**
     * @var ?string $handle
     */
    #[JsonProperty('handle')]
    public ?string $handle;

    /**
     * @var ?TargetOptions $options
     */
    #[JsonProperty('options')]
    public ?TargetOptions $options;

    /**
     * @var ?value-of<Platform> $platform
     */
    #[JsonProperty('platform')]
    public ?string $platform;

    /**
     * @var string $text
     */
    #[JsonProperty('text')]
    public string $text;

    /**
     * @param array{
     *   channelId: string,
     *   text: string,
     *   handle?: ?string,
     *   options?: ?TargetOptions,
     *   platform?: ?value-of<Platform>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channelId = $values['channelId'];
        $this->handle = $values['handle'] ?? null;
        $this->options = $values['options'] ?? null;
        $this->platform = $values['platform'] ?? null;
        $this->text = $values['text'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
