# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class Ad < Internal::Types::Model
      field :ad_set_external_id, -> { String }, optional: false, nullable: false, api_name: "adSetExternalId"

      field :campaign_external_id, -> { String }, optional: false, nullable: false, api_name: "campaignExternalId"

      field :external_id, -> { String }, optional: false, nullable: false, api_name: "externalId"

      field :name, -> { String }, optional: false, nullable: false

      field :post_id, -> { String }, optional: false, nullable: true, api_name: "postId"

      field :raw_status, -> { String }, optional: false, nullable: false, api_name: "rawStatus"

      field :status, -> { Peal::Types::AdObjectStatus }, optional: false, nullable: false

      field :totals, -> { Peal::Types::PaidTotals }, optional: false, nullable: false
    end
  end
end
