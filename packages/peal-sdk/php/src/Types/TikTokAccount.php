<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class TikTokAccount extends JsonSerializableType
{
    /**
     * @var TikTokAccountPosting $posting
     */
    #[JsonProperty('posting')]
    public TikTokAccountPosting $posting;

    /**
     * @var bool $takesPhotos
     */
    #[JsonProperty('takesPhotos')]
    public bool $takesPhotos;

    /**
     * @param array{
     *   posting: TikTokAccountPosting,
     *   takesPhotos: bool,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->posting = $values['posting'];
        $this->takesPhotos = $values['takesPhotos'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
