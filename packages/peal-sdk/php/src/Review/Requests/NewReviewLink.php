<?php

namespace Peal\Review\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Types\ReviewLinkAccess;
use Peal\Core\Json\JsonProperty;

class NewReviewLink extends JsonSerializableType
{
    /**
     * @var value-of<ReviewLinkAccess> $access
     */
    #[JsonProperty('access')]
    public string $access;

    /**
     * @var ?int $expiresInHours
     */
    #[JsonProperty('expiresInHours')]
    public ?int $expiresInHours;

    /**
     * @param array{
     *   access: value-of<ReviewLinkAccess>,
     *   expiresInHours?: ?int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->access = $values['access'];
        $this->expiresInHours = $values['expiresInHours'] ?? null;
    }
}
