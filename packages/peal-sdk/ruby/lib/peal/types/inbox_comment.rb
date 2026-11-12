# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class InboxComment < Internal::Types::Model
      field :author, -> { Peal::Types::InboxAuthor }, optional: false, nullable: true

      field :forgotten, -> { Peal::Types::InboxCommentForgotten }, optional: true, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :liked, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :parent_id, -> { String }, optional: false, nullable: true, api_name: "parentId"

      field :permalink, -> { String }, optional: false, nullable: true

      field :received_at, -> { String }, optional: false, nullable: false, api_name: "receivedAt"

      field :state, -> { Peal::Types::InboxCommentState }, optional: false, nullable: false

      field :text, -> { String }, optional: false, nullable: false

      field :thread_id, -> { String }, optional: false, nullable: false, api_name: "threadId"

      field :written_at, -> { String }, optional: false, nullable: false, api_name: "writtenAt"
    end
  end
end
