# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class Boost < Internal::Types::Model
      field :account_id, -> { String }, optional: false, nullable: false, api_name: "accountId"

      field :audience, -> { Peal::Types::BoostAudience }, optional: false, nullable: false

      field :beneficiary, -> { String }, optional: false, nullable: true

      field :budget, -> { Peal::Types::BoostBudget }, optional: false, nullable: false

      field :channel_id, -> { String }, optional: false, nullable: false, api_name: "channelId"

      field :committed, -> { Integer }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false, api_name: "createdAt"

      field :currency, -> { String }, optional: false, nullable: false

      field :ends_at, -> { String }, optional: false, nullable: false, api_name: "endsAt"

      field :failure_reason, -> { Peal::Types::BoostFailureReason }, optional: false, nullable: true, api_name: "failureReason"

      field :id, -> { String }, optional: false, nullable: false

      field :network_code, -> { String }, optional: false, nullable: true, api_name: "networkCode"

      field :objective, -> { Peal::Types::BoostObjective }, optional: false, nullable: false

      field :payer, -> { String }, optional: false, nullable: true

      field :platform, -> { Peal::Types::BoostPlatform }, optional: false, nullable: false

      field :post_id, -> { String }, optional: false, nullable: false, api_name: "postId"

      field :starts_at, -> { String }, optional: false, nullable: false, api_name: "startsAt"

      field :state, -> { Peal::Types::BoostState }, optional: false, nullable: false

      field :state_at, -> { String }, optional: false, nullable: false, api_name: "stateAt"

      field :updated_at, -> { String }, optional: false, nullable: false, api_name: "updatedAt"
    end
  end
end
