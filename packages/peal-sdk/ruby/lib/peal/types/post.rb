# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class Post < Internal::Types::Model
      field :author_id, -> { String }, optional: false, nullable: true, api_name: "authorId"

      field :content, -> { Peal::Types::PostContent }, optional: false, nullable: false

      field :created_via, -> { Peal::Types::PostOrigin }, optional: false, nullable: true, api_name: "createdVia"

      field :id, -> { String }, optional: false, nullable: false

      field :outcome, -> { Peal::Types::PostOutcome }, optional: false, nullable: true

      field :queue_id, -> { String }, optional: false, nullable: true, api_name: "queueId"

      field :schedule, -> { Peal::Types::PostSchedule }, optional: false, nullable: true

      field :scheduled_by, -> { String }, optional: false, nullable: true, api_name: "scheduledBy"

      field :scheduled_via, -> { Peal::Types::PostOrigin }, optional: false, nullable: true, api_name: "scheduledVia"

      field :status, -> { Peal::Types::PostStatus }, optional: false, nullable: false

      field :tag_ids, -> { Internal::Types::Array[String] }, optional: false, nullable: false, api_name: "tagIds"

      field :targets, -> { Internal::Types::Array[Peal::Types::PostTarget] }, optional: false, nullable: false

      field :warnings, -> { Internal::Types::Array[Peal::Types::PostWarning] }, optional: true, nullable: false
    end
  end
end
