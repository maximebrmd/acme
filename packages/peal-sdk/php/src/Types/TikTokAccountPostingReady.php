<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class TikTokAccountPostingReady extends JsonSerializableType
{
    /**
     * @var TikTokCreator $creator
     */
    #[JsonProperty('creator')]
    public TikTokCreator $creator;

    /**
     * @param array{
     *   creator: TikTokCreator,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->creator = $values['creator'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
