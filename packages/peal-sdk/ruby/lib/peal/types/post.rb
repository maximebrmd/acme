# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class Post < Internal::Types::Model
      field :author_id, -> { String }, optional: false, nullable: true, api_name: "authorId"

      field :content, -> { Peal::Types::PostContent }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :outcome, -> { Peal::Types::PostOutcome }, optional: false, nullable: true

      field :schedule, -> { Peal::Types::PostSchedule }, optional: false, nullable: true

      field :status, -> { Peal::Types::PostStatus }, optional: false, nullable: false

      field :targets, -> { Internal::Types::Array[Peal::Types::PostTarget] }, optional: false, nullable: false
    end
  end
end
