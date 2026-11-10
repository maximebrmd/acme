<?php

namespace Peal\Ads\Requests;

use Peal\Core\Json\JsonSerializableType;

class ListCampaignsAdsRequest extends JsonSerializableType
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
     * @param array{
     *   from?: ?string,
     *   to?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->from = $values['from'] ?? null;
        $this->to = $values['to'] ?? null;
    }
}
