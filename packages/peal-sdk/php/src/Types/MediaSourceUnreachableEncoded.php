<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class MediaSourceUnreachableEncoded extends JsonSerializableType
{
    /**
     * @var value-of<MediaSourceFailure> $reason
     */
    #[JsonProperty('reason')]
    public string $reason;

    /**
     * @var ?int $status
     */
    #[JsonProperty('status')]
    public ?int $status;

    /**
     * @param array{
     *   reason: value-of<MediaSourceFailure>,
     *   status?: ?int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->reason = $values['reason'];
        $this->status = $values['status'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
