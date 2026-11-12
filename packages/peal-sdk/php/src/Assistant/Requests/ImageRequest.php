<?php

namespace Peal\Assistant\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Types\ImageAspect;
use Peal\Core\Json\JsonProperty;

class ImageRequest extends JsonSerializableType
{
    /**
     * @var value-of<ImageAspect> $aspect
     */
    #[JsonProperty('aspect')]
    public string $aspect;

    /**
     * @var string $prompt
     */
    #[JsonProperty('prompt')]
    public string $prompt;

    /**
     * @param array{
     *   aspect: value-of<ImageAspect>,
     *   prompt: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->aspect = $values['aspect'];
        $this->prompt = $values['prompt'];
    }
}
