<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class NoticeEventXSpendCeiling extends JsonSerializableType
{
    /**
     * @var int $ceiling
     */
    #[JsonProperty('ceiling')]
    public int $ceiling;

    /**
     * @var int $percent
     */
    #[JsonProperty('percent')]
    public int $percent;

    /**
     * @var string $resetsAt
     */
    #[JsonProperty('resetsAt')]
    public string $resetsAt;

    /**
     * @param array{
     *   ceiling: int,
     *   percent: int,
     *   resetsAt: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->ceiling = $values['ceiling'];
        $this->percent = $values['percent'];
        $this->resetsAt = $values['resetsAt'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
