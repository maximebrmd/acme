<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class PlatformCapabilitiesAnalytics extends JsonSerializableType
{
    /**
     * @var bool $perPost
     */
    #[JsonProperty('perPost')]
    public bool $perPost;

    /**
     * @param array{
     *   perPost: bool,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->perPost = $values['perPost'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
