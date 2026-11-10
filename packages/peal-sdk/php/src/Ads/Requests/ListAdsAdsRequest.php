<?php

namespace Peal\Ads\Requests;

use Peal\Core\Json\JsonSerializableType;

class ListAdsAdsRequest extends JsonSerializableType
{
    /**
     * @var ?string $from
     */
    public ?string $from;

    /**
     * @var ?string $to
     */
    public ?string $to;

    /**
     * @var ?string $campaignId
     */
    public ?string $campaignId;

    /**
     * @param array{
     *   from?: ?string,
     *   to?: ?string,
     *   campaignId?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->from = $values['from'] ?? null;
        $this->to = $values['to'] ?? null;
        $this->campaignId = $values['campaignId'] ?? null;
    }
}
