<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class PublicationAttempt extends JsonSerializableType
{
    /**
     * @var int $attempt
     */
    #[JsonProperty('attempt')]
    public int $attempt;

    /**
     * @var string $finishedAt
     */
    #[JsonProperty('finishedAt')]
    public string $finishedAt;

    /**
     * @var int $part
     */
    #[JsonProperty('part')]
    public int $part;

    /**
     * @var ?string $refusalCode
     */
    #[JsonProperty('refusalCode')]
    public ?string $refusalCode;

    /**
     * @var value-of<AttemptResult> $result
     */
    #[JsonProperty('result')]
    public string $result;

    /**
     * @var ?string $retryAt
     */
    #[JsonProperty('retryAt')]
    public ?string $retryAt;

    /**
     * @var int $round
     */
    #[JsonProperty('round')]
    public int $round;

    /**
     * @var string $startedAt
     */
    #[JsonProperty('startedAt')]
    public string $startedAt;

    /**
     * @var string $targetId
     */
    #[JsonProperty('targetId')]
    public string $targetId;

    /**
     * @param array{
     *   attempt: int,
     *   finishedAt: string,
     *   part: int,
     *   result: value-of<AttemptResult>,
     *   round: int,
     *   startedAt: string,
     *   targetId: string,
     *   refusalCode?: ?string,
     *   retryAt?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->attempt = $values['attempt'];
        $this->finishedAt = $values['finishedAt'];
        $this->part = $values['part'];
        $this->refusalCode = $values['refusalCode'] ?? null;
        $this->result = $values['result'];
        $this->retryAt = $values['retryAt'] ?? null;
        $this->round = $values['round'];
        $this->startedAt = $values['startedAt'];
        $this->targetId = $values['targetId'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
