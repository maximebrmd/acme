# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class RecyclingRule < Internal::Types::Model
      field :anchor_at, -> { String }, optional: false, nullable: false, api_name: "anchorAt"

      field :coming, -> { Internal::Types::Array[Peal::Types::RecyclingComing] }, optional: false, nullable: false

      field :count, -> { Integer }, optional: false, nullable: true

      field :created_at, -> { String }, optional: false, nullable: false, api_name: "createdAt"

      field :ended_reason, -> { Peal::Types::RecyclingEndReason }, optional: false, nullable: true, api_name: "endedReason"

      field :every, -> { Peal::Types::RecyclingInterval }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :last_due_at, -> { String }, optional: false, nullable: false, api_name: "lastDueAt"

      field :made, -> { Integer }, optional: false, nullable: false

      field :next_due_at, -> { String }, optional: false, nullable: true, api_name: "nextDueAt"

      field :queue_id, -> { String }, optional: false, nullable: true, api_name: "queueId"

      field :source_post_id, -> { String }, optional: false, nullable: false, api_name: "sourcePostId"

      field :started_by, -> { String }, optional: false, nullable: true, api_name: "startedBy"

      field :started_via, -> { Peal::Types::PostOrigin }, optional: false, nullable: false, api_name: "startedVia"

      field :status, -> { Peal::Types::RecyclingStatus }, optional: false, nullable: false

      field :time_zone, -> { String }, optional: false, nullable: false, api_name: "timeZone"

      field :until_, -> { String }, optional: false, nullable: true, api_name: "until"

      field :variants, -> { Internal::Types::Array[Peal::Types::RecyclingRuleVariantsItem] }, optional: false, nullable: false
    end
  end
end
