<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class AdInsightReport extends JsonSerializableType
{
    /**
     * @var AdAccount $account
     */
    #[JsonProperty('account')]
    public AdAccount $account;

    /**
     * @var string $from
     */
    #[JsonProperty('from')]
    public string $from;

    /**
     * @var array<AdInsightDay> $rows
     */
    #[JsonProperty('rows'), ArrayType([AdInsightDay::class])]
    public array $rows;

    /**
     * @var string $to
     */
    #[JsonProperty('to')]
    public string $to;

    /**
     * @param array{
     *   account: AdAccount,
     *   from: string,
     *   rows: array<AdInsightDay>,
     *   to: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->account = $values['account'];
        $this->from = $values['from'];
        $this->rows = $values['rows'];
        $this->to = $values['to'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
