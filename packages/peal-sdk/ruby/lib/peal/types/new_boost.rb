# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class NewBoost < Internal::Types::Model
      field :account_id, -> { String }, optional: false, nullable: false, api_name: "accountId"

      field :audience, -> { Peal::Types::BoostAudience }, optional: false, nullable: false

      field :beneficiary, -> { String }, optional: true, nullable: false

      field :budget, -> { Peal::Types::BoostBudget }, optional: false, nullable: false

      field :channel_id, -> { String }, optional: false, nullable: false, api_name: "channelId"

      field :currency, -> { String }, optional: false, nullable: false

      field :ends_at, -> { String }, optional: false, nullable: false, api_name: "endsAt"

      field :payer, -> { String }, optional: true, nullable: false

      field :post_id, -> { String }, optional: false, nullable: false, api_name: "postId"

      field :special_ad_category, -> { Peal::Types::SpecialAdCategory }, optional: false, nullable: false, api_name: "specialAdCategory"

      field :starts_at, -> { String }, optional: true, nullable: false, api_name: "startsAt"
    end
  end
end
