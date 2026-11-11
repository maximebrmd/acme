<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class PostFormatCapabilities extends JsonSerializableType
{
    /**
     * @var string $description
     */
    #[JsonProperty('description')]
    public string $description;

    /**
     * @var MediaCapabilities $media
     */
    #[JsonProperty('media')]
    public MediaCapabilities $media;

    /**
     * @var string $name
     */
    #[JsonProperty('name')]
    public string $name;

    /**
     * @var bool $sendsText
     */
    #[JsonProperty('sendsText')]
    public bool $sendsText;

    /**
     * @param array{
     *   description: string,
     *   media: MediaCapabilities,
     *   name: string,
     *   sendsText: bool,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->description = $values['description'];
        $this->media = $values['media'];
        $this->name = $values['name'];
        $this->sendsText = $values['sendsText'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
